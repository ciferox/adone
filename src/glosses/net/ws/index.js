export const constants = {
    BINARY_TYPES: ["nodebuffer", "arraybuffer", "fragments"],
    GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
    kStatusCode: Symbol("status-code"),
    kWebSocket: Symbol("websocket")
};

adone.lazify({
    Client: "./client",
    Server: "./server",
    Sender: "./sender",
    Receiver: "./receiver",
    PerMessageDeflate: "./per_message_deflate",
    extension: "./extension",
    stream: "./stream",
    util: "./utils"
}, exports, require);
