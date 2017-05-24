adone.lazify({
    Server: "./server",
    tunnel: "./tunnel",
    createSocket: ["./client", (x) => x.createSocket]
}, exports, require);
