adone.lazify({
    Agent: "./agent",
    ClientParser: ["./client", (x) => x.Parser],
    Client: ["./client", (x) => x.Client],
    ServerParser: ["./server", (x) => x.Parser],
    Server: ["./server", (x) => x.Server],
    c: "./c",
    createConnection: () => (options, callback) => {
        const client = new adone.net.proxy.shadowsocks.Client(options);
        process.nextTick(() => {
            client.connect(options, callback);
        });
        return client;
    },
    createServer: () => (options, callback) => new adone.net.proxy.shadowsocks.Server(options, callback)
}, exports, require);
