adone.lazify({
    util: "./utils",
    mime: "./mimes",
    Socket: "./socket",
    Server: "./server",
    ssh: "./ssh",
    ip: "./ip",
    proxy: () => adone.lazify({
        socks: "./proxies/socks",
        http: "./proxies/http",
        shadowsocks: "./proxies/shadowsocks"
    }, null, require),
    ws: "./ws",
    http: "./http",
    mail: "./mail",
    mqtt: "./mqtt",
    amqp: "./amqp",
    dns: "./dns"
}, adone.asNamespace(exports), require);
