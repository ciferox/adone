// load websocket library if we are not in the browser
const WebSocket = require("./web-socket");
const duplex = require("./duplex");
const wsurl = require("./ws-url");

module.exports = function (addr, opts) {
    const location = typeof(window) === "undefined" ? {} : window.location;

    const url = wsurl(addr, location);
    const socket = new WebSocket(url, opts.websocket);

    const stream = duplex(socket, opts);
    stream.remoteAddress = url;
    stream.close = () => new Promise((resolve, reject) => {
        socket.addEventListener("close", resolve);
        socket.close();
    });

    return stream;
};

module.exports.connect = module.exports;
