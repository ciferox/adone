const Hapi = require("hapi");
const config = require("./config");
const log = config.log;
// const epimetheus = require("epimetheus");
const path = require("path");

const {
    is
} = adone;

exports = module.exports;

exports.start = (options, callback) => {
    if (is.function(options)) {
        callback = options;
        options = {};
    }

    if (options.host) {
        config.hapi.host = options.host;
    }

    if (is.number(options.port)) {
        config.hapi.port = options.port;
    }

    const http = new Hapi.Server(config.hapi);

    http.register(require("inert")).then((err) => {
        if (err) {
            return callback(err);
        }

        http.start().then((err) => {
            if (err) {
                return callback(err);
            }

            log(`signaling server has started on: ${http.info.uri}`);

            // http.peers = require("./routes-ws")(http, options.metrics).peers;
            require("./routes-ws").call(http, http, options.metrics);

            http.route({
                method: "GET",
                path: "/",
                handler: (request, h) => ({ file: path.join(__dirname, "index.html") })
            });

            callback(null, http);
        });

        // if (options.metrics) {
        //     epimetheus.instrument(http);
        // }
    });

    return http;
};
