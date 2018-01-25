const __ = adone.lazify({
    duplex: "./duplex",
    source: "./source",
    sink: "./sink",
    Server: "./server",
    connect: "./client",
    wsurl: "./wsurl",
    ready: "./ready"
}, exports, require);

export const createServer = (opts, onConnection) => new __.Server(opts, onConnection);
