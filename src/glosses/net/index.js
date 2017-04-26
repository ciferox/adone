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
        WebSocket: "./ws/websocket",
        WebSocketServer: "./ws/websocket_server",
        Sender: "./ws/sender",
        Receiver: "./ws/receiver",
        PerMessageDeflate: "./ws/per_message_deflate",
        exts: "./ws/extensions",
        errorCodes: () => ({
            isValidErrorCode(code) {
                return (code >= 1000 && code <= 1013 && code !== 1004 && code !== 1005 && code !== 1006) || (code >= 3000 && code <= 4999);
            },
            1000: "normal",
            1001: "going away",
            1002: "protocol error",
            1003: "unsupported data",
            1004: "reserved",
            1005: "reserved for extensions",
            1006: "reserved for extensions",
            1007: "inconsistent or invalid data",
            1008: "policy violation",
            1009: "message too big",
            1010: "extension handshake missing",
            1011: "an unexpected condition prevented the request from being fulfilled",
            1012: "service restart",
            1013: "try again later"
        }),
        constants: () => ({
            BINARY_TYPES: ["nodebuffer", "arraybuffer", "fragments"],
            GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        }),
        bufferutil: () => {
            const b = adone.bind("wsbufferutil.node").BufferUtil;

            return {
                concat: (list, totalLength) => {
                    const target = Buffer.allocUnsafe(totalLength);
                    let offset = 0;

                    for (let i = 0; i < list.length; i++) {
                        const buf = list[i];
                        buf.copy(target, offset);
                        offset += buf.length;
                    }

                    return target;
                },
                mask: b.mask,
                unmask: b.unmask
            };
        }
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
