adone.lazify({
    util: "./util",
    Socket: "./socket",
    Server: "./server",
    ssh: "./ssh",
    address: () => adone.lazify({
        IP4: ["./address", (mod) => mod.IP4],
        IP6: ["./address", (mod) => mod.IP6],
        v6helpers: "./address/v6helpers"
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
        Application: "./http",
        Middleware: "./http/middleware",
        helper: "./http/helpers",
        x: "./http/x",
        Server: "./http/server",
        client: "./http/client",
        middleware: () => adone.lazify({
            router: "./http/middlewares/router",
            renderer: ["./http/middlewares/renderer", (mod) => adone.lazify({
                Engine: ["./http/middlewares/renderer/engine", (mod) => {
                    mod.default.compile = mod.compile;
                    mod.default.render = mod.render;
                    return mod.default;
                }]
            }, mod.default, require)],
            cookies: "./http/middlewares/cookies",
            body: ["./http/middlewares/body", (mod) => adone.lazify({
                buffer: "./http/middlewares/body/buffer",
                json: "./http/middlewares/body/json",
                multipart: "./http/middlewares/body/multipart",
                text: "./http/middlewares/body/text",
                urlencoded: "./http/middlewares/body/urlencoded"
            }, mod.default, require)],
            session: ["./http/middlewares/session", (mod) => {
                mod.default.Store = mod.Store;
                return mod.default;
            }],
            static: "./http/middlewares/static",
            favicon: "./http/middlewares/favicon",
            logger: "./http/middlewares/logger",
            useragent: "./http/middlewares/useragent",
            geoip: "./http/middlewares/geoip",
            rewrite: "./http/middlewares/rewrite"
        })
    }, null, require)
}, exports, require);
