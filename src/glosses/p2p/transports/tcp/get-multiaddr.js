const {
    multiformat: { multiaddr },
    net: { ip: { IP6 } }
} = adone;

const debug = require("debug");
const log = debug("libp2p:tcp:get-multiaddr");

module.exports = (socket) => {
    let ma;

    try {
        if (socket.remoteFamily === "IPv6") {
            const addr = new IP6(socket.remoteAddress);

            if (addr.v4) {
                const ip4 = addr.to4().correctForm();
                ma = multiaddr(`/ip4/${ip4}/tcp/${socket.remotePort}`
                );
            } else {
                ma = multiaddr(`/ip6/${socket.remoteAddress}/tcp/${socket.remotePort}`
                );
            }
        } else {
            ma = multiaddr(`/ip4/${socket.remoteAddress}/tcp/${socket.remotePort}`);
        }
    } catch (err) {
        log(err);
    }
    return ma;
};
