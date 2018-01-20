const {
    netron2: { Connection },
    event,
    stream: { pull, Multiplex, pump }
} = adone;

const MULTIPLEX_CODEC = "/mplex/6.7.0";

// Catch error makes sure that even though we get the "Channel destroyed" error from when closing streams, that it's not leaking through since it's not really an error for us, channels shoul close cleanly.
const catchError = function (stream) {
    return {
        source: pull(
            stream.source,
            pull.catch((err) => {
                if (err.message === "Channel destroyed") {
                    return;
                }
                return false;
            })
        ),
        sink: stream.sink
    };
};


class Muxer extends event.Emitter {
    constructor(conn, multiplex) {
        super();
        this.multiplex = multiplex;
        this.conn = conn;
        this.multicodec = MULTIPLEX_CODEC;

        multiplex.on("close", () => this.emit("close"));
        multiplex.on("error", (err) => this.emit("error", err));

        multiplex.on("stream", (stream, id) => {
            const muxedConn = new Connection(
                catchError(pull.fromStream.duplex(stream)),
                this.conn
            );
            this.emit("stream", muxedConn);
        });
    }

    // method added to enable pure stream muxer feeling
    newStream(callback) {
        callback = callback || adone.noop;
        const stream = this.multiplex.createStream();

        const conn = new Connection(
            catchError(pull.fromStream.duplex(stream)),
            this.conn
        );

        setImmediate(() => callback(null, conn));

        return conn;
    }

    end(callback) {
        callback = callback || adone.noop;
        this.multiplex.once("close", callback);
        this.multiplex.destroy();
    }
}

const create = function (rawConn, isListener) {
    const stream = pull.toStream(rawConn);

    // Cleanup and destroy the connection when it ends
    // as the converted stream doesn't emit 'close'
    // but .destroy will trigger a 'close' event.
    stream.on("end", () => stream.destroy());

    const mpx = new Multiplex({
        halfOpen: true,
        initiator: !isListener
    });
    pump(stream, mpx, stream);

    return new Muxer(rawConn, mpx);
};

exports = module.exports = create;
exports.multicodec = MULTIPLEX_CODEC;
exports.dialer = (conn) => create(conn, false);
exports.listener = (conn) => create(conn, true);
