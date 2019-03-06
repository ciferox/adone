const EventEmitter = require("events").EventEmitter;
const setImmediate = require("async/setImmediate");
const debug = require("debug");
const log = debug("mplex");
log.error = debug("mplex:error");

const MULTIPLEX_CODEC = require("./codec");

const {
    is,
    noop,
    p2p: { Connection },
    stream: { pull2: pull }
} = adone;
const { catch: pullCatch, streamToPullStream: toPull } = pull;


// Catch error makes sure that even though we get the "Channel destroyed" error
// from when closing streams, that it's not leaking through since it's not
// really an error for us, channels shoul close cleanly.
const catchError = function (stream) {
    return {
        source: pull(
            stream.source,
            pullCatch((err) => {
                if (err.message === "Channel destroyed") {
                    return;
                }
                return false;
            })
        ),
        sink: stream.sink
    };
};

class MultiplexMuxer extends EventEmitter {
    constructor(conn, multiplex) {
        super();
        this.multiplex = multiplex;
        this.conn = conn;
        this.multicodec = MULTIPLEX_CODEC;

        multiplex.on("close", () => this.emit("close"));
        multiplex.on("error", (err) => this.emit("error", err));

        multiplex.on("stream", (stream, id) => {
            const muxedConn = new Connection(
                catchError(toPull.duplex(stream)),
                this.conn
            );
            this.emit("stream", muxedConn);
        });
    }

    /**
     * Conditionally emit errors if we have listeners. All other
     * events are sent to EventEmitter.emit
     *
     * @param {string} eventName
     * @param  {...any} args
     * @returns {void}
     */
    emit(eventName, ...args) {
        if (eventName === "error" && !this._events.error) {
            log.error("error", ...args);
        } else {
            super.emit(eventName, ...args);
        }
    }

    // method added to enable pure stream muxer feeling
    newStream(callback) {
        callback = callback || noop;
        let stream;
        try {
            stream = this.multiplex.createStream();
        } catch (err) {
            return setImmediate(() => callback(err));
        }

        const conn = new Connection(
            catchError(toPull.duplex(stream)),
            this.conn
        );

        setImmediate(() => callback(null, conn));

        return conn;
    }

    /**
     * Destroys multiplex and ends all internal streams
     *
     * @param {Error} err Optional error to pass to end the muxer with
     * @param {function()} callback Optional
     * @returns {void}
     */
    end(err, callback) {
        if (is.function(err)) {
            callback = err;
            err = null;
        }
        callback = callback || noop;
        this.multiplex.destroy(err);
        callback();
    }
}

module.exports = MultiplexMuxer;