adone.lazify({
    duplex: "./duplex",
    source: "./source",
    sink: "./sink",
    Server: ["./server", (x) => x.Server],
    createServer: ["./server", (x) => x.createServer],
    connect: "./client",
    wsurl: "./wsurl",
    ready: "./ready"
}, exports, require);
