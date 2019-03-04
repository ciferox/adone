

const debug = require("debug");

const log = debug("libp2p:floodsub");
log.err = debug("libp2p:floodsub:error");

module.exports = {
    log,
    multicodec: "/floodsub/1.0.0"
};
