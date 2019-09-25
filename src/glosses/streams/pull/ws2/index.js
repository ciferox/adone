exports = module.exports = require("./duplex");

adone.lazify({
    source: "./source",
    sink: "./sink",
    createServer: "./server",
    connect: "./client"
}, exports, require);

