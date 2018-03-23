const Hapi = require("hapi");
const config = require("./config");
const log = config.log;
const epimetheus = require("epimetheus");
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

    const port = options.port || config.hapi.port;
    const host = options.host || config.hapi.host;

    const http = new Hapi.Server(config.hapi.options);

    http.connection({
        port,
        host
    });

    http.register({ register: require("inert") }, (err) => {
        if (err) {
            return callback(err);
        }

        http.start((err) => {
            if (err) {
                return callback(err);
            }

            log(`signaling server has started on: ${http.info.uri}`);

            const routesWs = require("./routes-ws");
            routesWs(http, options.metrics);
            http.peers = routesWs.peers;

            http.route({
                method: "GET",
                path: "/",
                handler: (request, reply) => reply.file(path.join(__dirname, "index.html"), {
                    confine: false
                })
            });

            callback(null, http);
        });

        if (options.metrics) {
            epimetheus.instrument(http);
        }
    });

    return http;
};
