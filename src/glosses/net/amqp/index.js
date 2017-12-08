adone.lazify({
    credentials: "./credentials",
    x: "./x"
}, exports, require);

adone.lazifyPrivate({
    Args: "./api_args",
    connect: "./connect",
    ChannelModel: "./channel_model",
    channel: "./channel",
    defs: "./defs",
    codec: "./codec",
    heartbeat: "./heartbeat",
    frame: "./frame",
    Mux: "./mux",
    format: "./format"
}, exports, require);

const __ = adone.private(exports);

export const connect = (url, connOptions) => new Promise((resolve, reject) => {
    __.connect.connect(url, connOptions, (err, conn) => {
        err ? reject(err) : resolve(new __.ChannelModel(conn));
    });
});
