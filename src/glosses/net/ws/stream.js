const { is } = adone;

const buildProxy = (options, socketWrite, socketEnd) => {
    const proxy = new adone.std.stream.Transform({
        objectMode: options.objectMode
    });

    proxy._write = socketWrite;
    proxy._flush = socketEnd;

    return proxy;
};

const createClient = (target, protocols, options) => {
    let stream;
    let socket;

    if (protocols && !is.array(protocols) && is.object(protocols)) {
        // accept the "options" Object as the 2nd argument
        options = protocols;
        protocols = null;

        if (is.string(options.protocol) || is.array(options.protocol)) {
            protocols = options.protocol;
        }
    }

    if (!options) {
        options = {};
    }

    if (is.undefined(options.objectMode)) {
        options.objectMode = !(options.binary === true || is.undefined(options.binary));
    }
    const coerceToBuffer = !options.objectMode;

    const proxy = buildProxy(options, (chunk, enc, next) => {
        // avoid errors, this never happens unless
        // destroy() is called
        if (socket.readyState !== socket.OPEN) {
            next();
            return;
        }

        if (coerceToBuffer && is.string(chunk)) {
            chunk = Buffer.from(chunk, "utf8");
        }
        socket.send(chunk, next);
    }, (done) => {
        socket.close();
        done();
    });

    if (!options.objectMode) {
        // this is to be enabled only if objectMode is false
        proxy._writev = function (chunks, cb) {
            const buffers = new Array(chunks.length);
            for (let i = 0; i < chunks.length; i++) {
                if (is.string(chunks[i].chunk)) {
                    buffers[i] = Buffer.from(chunks[i], "utf8");
                } else {
                    buffers[i] = chunks[i].chunk;
                }
            }

            this._write(Buffer.concat(buffers), "binary", cb);
        };
    }

    // use existing WebSocket object that was passed in
    if (is.object(target)) {
        socket = target;
        // otherwise make a new one
    } else {
        socket = new adone.net.ws.Client(target, protocols, options);
        socket.binaryType = "arraybuffer";
    }

    // was already open when passed in
    if (socket.readyState === socket.OPEN) {
        stream = proxy;
    } else {
        stream = adone.stream.Duplexify.obj();
        socket.onopen = () => {
            stream.setReadable(proxy);
            stream.setWritable(proxy);
            stream.emit("connect");
        };
    }

    stream.socket = socket;

    socket.onclose = () => {
        stream.end();
        stream.destroy();
    };
    socket.onerror = (err) => {
        stream.destroy(err);
    };
    socket.onmessage = (event) => {
        let data = event.data;
        if (data instanceof ArrayBuffer) {
            data = Buffer.from(data);
        } else {
            data = Buffer.from(data, "utf8");
        }
        proxy.push(data);
    };

    proxy.on("close", () => {
        socket.close();
    });

    return stream;
};

adone.lazify({
    createClient: () => createClient,
    createServer: () => {
        class Server extends adone.net.ws.Server {
            constructor(opts, cb) {
                super(opts);

                let proxied = false;
                this.on("newListener", (event) => {
                    if (!proxied && event === "stream") {
                        proxied = true;
                        this.on("connection", (conn, req) => {
                            this.emit("stream", createClient(conn, opts), req);
                        });
                    }
                });

                if (cb) {
                    this.on("stream", cb);
                }
            }
        }

        return (opts, cb) => new Server(opts, cb);
    }
}, exports, require);
