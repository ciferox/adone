adone.lazify({
    ServerParser: ["./server", (x) => x.Parser],
    Server: ["./server", (x) => x.Server]
}, exports, require);
