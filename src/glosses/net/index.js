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
        socks: "./proxies/socks"
    }, null, require),
    ws: () => adone.lazify({
        WebSocket: "./ws/webSocket",
        WebSocketServer: "./ws/webSocketServer",
        Sender: "./ws/sender",
        Receiver: "./ws/receiver",
        PerMessageDeflate: "./ws/perMessageDeflate",
        exts: "./ws/extensions",
        buildHostHeader: ["./ws/webSocket", (mod) => mod.buildHostHeader],
        bufferutil: "./ws/bufferutil"
    }, null, require),
    mail: () => adone.lazify({
        assign: "./mail/assign",
        shared: "./mail/shared",
        cookies: "./mail/cookies",
        fetch: "./mail/fetch",
        base64: "./mail/base64",
        qp: "./mail/qp",
        mime: "./mail/mime",
        mimetypes: "./mail/mimetypes",
        charset: "./mail/charset",
        addressparser: "./mail/addressparser",
        wellknown: "./mail/wellknown",
        httpProxy: "./mail/http_proxy",
        templateSender: "./mail/template_sender",
        buildmail: "./mail/buildmail",
        dataStream: "./mail/data_stream",
        composer: "./mail/composer",
        poolResource: "./mail/pool_resource",
        stubTransport: "./mail/stub_transport",
        directTransport: "./mail/direct_transport",
        smtpTransport: "./mail/smtp_transport",
        messageQueue: "./mail/message_queue",
        smtpConnection: "./mail/smtp_connection",
        smtpPool: "./mail/smtp_pool",
        mailer: "./mail/mailer"
    }, null, require),
    http: () => adone.lazify({
        server: "./http/server",
        client: "./http/client",
        x: "./http/x"
    }, null, require)
}, exports, require);
