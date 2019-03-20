const rurl = require("relative-url");
const map = { http: "ws", https: "wss" };
const def = "ws";
module.exports = function (url, location) {
    return rurl(url, location, map, def);
};


