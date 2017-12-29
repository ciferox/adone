const {
    is,
    stream: { pull }
} = adone;

const {
    ws: {
        duplex,
        wsurl
    }
} = pull;

export default function (addr, opts) {
    if (is.function(opts)) {
        opts = { onConnect: opts };
    }

    const url = wsurl(addr, {});
    const socket = new adone.net.ws.Client(url);

    const stream = duplex(socket, opts);
    stream.remoteAddress = url;
    stream.close = function (cb) {
        if (is.function(cb)) {
            socket.addEventListener("close", cb);
        }
        socket.close();
    };

    socket.addEventListener("open", (e) => {
        if (opts && is.function(opts.onConnect)) {
            opts.onConnect(null, stream);
        }
    });

    return stream;
}
