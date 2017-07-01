const runtime = adone.lazify({
    parseStream: "./parse_stream",
    generateStream: "./generate_stream",
    writeToStream: "./write_to_stream"
}, exports, require);

export class Connection extends adone.stream.Duplexify {
    constructor(stream, opts = {}) {
        const inStream = runtime.writeToStream(stream);
        const outStream = runtime.parseStream(opts);

        super(inStream, outStream, { objectMode: true });

        stream.pipe(outStream);

        inStream.on("error", this.emit.bind(this, "error"));
        outStream.on("error", this.emit.bind(this, "error"));

        this.stream = stream;

        stream.on("error", this.emit.bind(this, "error"));
        stream.on("close", this.emit.bind(this, "close"));

        if (opts.notData !== true) {
            this.on("data", (packet) => this.emit(packet.cmd, packet));
        }
    }

    destroy() {
        if (this.stream.destroy) {
            this.stream.destroy();
        } else {
            this.stream.end();
        }
    }
}

[
    "connect",
    "connack",
    "publish",
    "puback",
    "pubrec",
    "pubrel",
    "pubcomp",
    "subscribe",
    "suback",
    "unsubscribe",
    "unsuback",
    "pingreq",
    "pingresp",
    "disconnect"
].forEach((cmd) => {
    Connection.prototype[cmd] = function (opts, cb) {
        opts = opts || {};
        opts.cmd = cmd;

        // Flush the buffer if needed
        // UGLY hack, we should listen for the 'drain' event
        // and start writing again, but this works too
        this.write(opts);
        if (cb) {
            setImmediate(cb);
        }
    };
});
