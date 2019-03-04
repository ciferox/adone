const Hapi = require("hapi");
const path = require("path");
// const epimetheus = require("epimetheus");
const merge = require("merge-recursive").recursive;
const defaultConfig = require("./config");

const {
    is
} = adone;

exports = module.exports;

exports.start = (options, callback) => {
    if (is.function(options)) {
        callback = options;
        options = {};
    }

    const config = merge(Object.assign({}, defaultConfig), adone.util.omit(options, ["host", "port"]));
    const log = config.log;

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

            log(`rendezvous server has started on: ${http.info.uri}`);

            http.peers = require("./routes")(config, http).peers;

            http.route({
                method: "GET",
                path: "/",
                handler: (request, h) => ({ file: path.join(__dirname, "index.html") })
            });

            callback(null, http);
        });
    });

    // if (config.metrics) {
    //     epimetheus.instrument(http);
    // }

    return http;
};
