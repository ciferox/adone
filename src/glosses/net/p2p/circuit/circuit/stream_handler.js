const {
    is,
    stream: { pull }
} = adone;

export default class StreamHandler {
    /**
     * Create a stream handler for connection
     *
     * @param {Connection} conn - connection to read/write
     * @param {Function|undefined} cb - handshake callback called on error
     * @param {Number} timeout - handshake timeout
     * @param {Number} maxLength - max bytes length of message
     */
    constructor(conn, cb, timeout, maxLength) {
        this.conn = conn;
        this.stream = null;
        this.shake = null;
        this.timeout = cb || 1000 * 60;
        this.maxLength = maxLength || 4096;

        if (is.function(cb)) {
            this.timeout = timeout || 1000 * 60;
        }

        this.stream = pull.handshake({ timeout: this.timeout }, cb);
        this.shake = this.stream.handshake;

        pull(this.stream, conn, this.stream);
    }

    isValid() {
        return this.conn && this.shake && this.stream;
    }

    /**
     * Read and decode message
     *
     * @param {Function} cb
     * @returns {void|Function}
     */
    read(cb) {
        if (!this.isValid()) {
            cb(new Error("handler is not in a valid state"));
        }

        pull.lengthPrefixed.decodeFromReader(this.shake, { maxLength: this.maxLength }, (err, msg) => {
            if (err) {
                // this.shake.abort(err)
                return cb(err);
            }

            return cb(null, msg);
        });
    }

    /**
     * Encode and write array of buffers
     *
     * @param {Buffer[]} msg
     * @param {Function} [cb]
     * @returns {Function}
     */
    write(msg, cb) {
        cb = cb || (() => { });

        if (!this.isValid()) {
            cb(new Error("handler is not in a valid state"));
        }

        pull(
            pull.values([msg]),
            pull.lengthPrefixed.encode(),
            pull.collect((err, encoded) => {
                if (err) {
                    this.shake.abort(err);
                    return cb(err);
                }

                encoded.forEach((e) => this.shake.write(e));
                cb();
            })
        );
    }

    /**
     * Get the raw Connection
     *
     * @returns {null|Connection|*}
     */
    getRawConn() {
        return this.conn;
    }

    /**
     * Return the handshake rest stream and invalidate handler
     *
     * @return {*|{source, sink}}
     */
    rest() {
        const rest = this.shake.rest();

        this.conn = null;
        this.stream = null;
        this.shake = null;
        return rest;
    }
}
