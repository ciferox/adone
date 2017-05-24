adone.lazify({
    util: "./utils",
    mime: "./mimes",
    Socket: "./socket",
    Server: "./server",
    ssh: "./ssh",
    address: () => adone.lazify({
        IP4: ["./address", (mod) => mod.IP4],
        IP6: ["./address", (mod) => mod.IP6],
        v6helpers: "./address/v6helpers",
        lookup: () => adone.promise.promisify(adone.std.dns.lookup)
    }, null, require),
    proxy: () => adone.lazify({
        socks: "./proxies/socks",
        http: "./proxies/http",
        shadowsocks: "./proxies/shadowsocks"
    }, null, require),
    ws: "./ws",
    http: () => adone.lazify({
        server: "./http/server",
        client: "./http/client",
        x: "./http/x"
    }, null, require),
    mail: "./mail"
}, exports, require);
