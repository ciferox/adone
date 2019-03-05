
// eslint-disable-next-line yoda
module.exports = "undefined" === typeof WebSocket ? require("ws") : WebSocket;
