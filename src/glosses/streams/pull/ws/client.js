const {
    is
} = adone;

//load websocket library if we are not in the browser
const WebSocket = require("ws");
const duplex = require("./duplex");
const wsurl = require("./ws-url");

function isFunction(f) {
    return is.function(f);
}

module.exports = function (addr, opts) {
    if (isFunction(opts)) {
        opts = { onConnect: opts };
    }

    const url = wsurl(addr, {});
    const socket = new WebSocket(url);

    const stream = duplex(socket, opts);
    stream.remoteAddress = url;
    stream.close = function (cb) {
        if (isFunction(cb)) {
            socket.addEventListener("close", cb);
        }
        socket.close();
    };

    socket.addEventListener("open", (e) => {
        if (opts && isFunction(opts.onConnect)) {
            opts.onConnect(null, stream);
        }
    });

    return stream;
};

module.exports.connect = module.exports;
