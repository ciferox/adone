const pull = require("pull-stream");

const echo = function (protocol, conn) {
    pull(conn, conn);
};

module.exports = echo;
module.exports.multicodec = "/echo/1.0.0";
