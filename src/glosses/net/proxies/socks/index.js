const SocksClient = require("./socks-client.js");
const SocksAgent = require("./socks-agent.js");

exports.createConnection = SocksClient.createConnection;
exports.createUDPFrame = SocksClient.createUDPFrame;
exports.Agent = SocksAgent.Agent;
