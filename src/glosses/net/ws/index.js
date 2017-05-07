adone.lazify({
    WebSocket: "./websocket",
    WebSocketServer: "./websocket_server",
    Sender: "./sender",
    Receiver: "./receiver",
    PerMessageDeflate: "./per_message_deflate",
    exts: "./extensions",
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
    })
}, exports, require);
