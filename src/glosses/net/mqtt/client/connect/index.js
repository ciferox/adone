const { is } = adone;
const protocols = adone.lazify({
    mqtt: "./tcp",
    tcp: "./tcp",
    ssl: "./tls",
    tls: "./tls",
    mqtts: "./tls",
    ws: "./ws",
    wss: "./ws"
}, null, require);

/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {Object} [opts] option object
 */
const parseAuthOptions = (opts) => {
    let matches;
    if (opts.auth) {
        matches = opts.auth.match(/^(.+):(.+)$/);
        if (matches) {
            opts.username = matches[1];
            opts.password = matches[2];
        } else {
            opts.username = opts.auth;
        }
    }
};

const connect = (brokerUrl, opts) => {
    if ((is.object(brokerUrl)) && !opts) {
        opts = brokerUrl;
        brokerUrl = null;
    }

    opts = opts || {};

    if (brokerUrl) {
        const parsed = adone.std.url.parse(brokerUrl, true);
        if (!is.null(parsed.port)) {
            parsed.port = Number(parsed.port);
        }

        opts = Object.assign({}, parsed, opts);

        if (is.null(opts.protocol)) {
            throw new Error("Missing protocol");
        }
        opts.protocol = opts.protocol.replace(/:$/, "");
    }

    // merge in the auth options if supplied
    parseAuthOptions(opts);

    // support clientId passed in the query string of the url
    if (opts.query && is.string(opts.query.clientId)) {
        opts.clientId = opts.query.clientId;
    }

    if (opts.cert && opts.key) {
        if (opts.protocol) {
            if (["mqtts", "wss"].indexOf(opts.protocol) === -1) {
                /*
                 * jshint and eslint
                 * complains that break from default cannot be reached after throw
                 * it is a foced exit from a control structure
                 * maybe add a check after switch to see if it went through default
                 * and then throw the error
                */
                /* jshint -W027 */
                /* eslint no-unreachable:1 */
                switch (opts.protocol) {
                    case "mqtt":
                        opts.protocol = "mqtts";
                        break;
                    case "ws":
                        opts.protocol = "wss";
                        break;
                    default:
                        throw new Error(`Unknown protocol for secure connection: "${opts.protocol}"!`);
                        break;
                }
                /* eslint no-unreachable:0 */
                /* jshint +W027 */
            }
        } else {
            // don't know what protocol he want to use, mqtts or wss
            throw new Error("Missing secure protocol key");
        }
    }

    if (!protocols[opts.protocol]) {
        const isSecure = ["mqtts", "wss"].indexOf(opts.protocol) !== -1;
        opts.protocol = [
            "mqtt",
            "mqtts",
            "ws",
            "wss"
        ].filter((key, index) => {
            if (isSecure && index % 2 === 0) {
                // Skip insecure protocols when requesting a secure one.
                return false;
            }
            return (is.function(protocols[key]));
        })[0];
    }

    if (opts.clean === false && !opts.clientId) {
        throw new Error("Missing clientId for unclean clients");
    }

    const wrapper = (client) => {
        if (opts.servers) {
            if (!client._reconnectCount || client._reconnectCount === opts.servers.length) {
                client._reconnectCount = 0;
            }

            opts.host = opts.servers[client._reconnectCount].host;
            opts.port = opts.servers[client._reconnectCount].port;
            opts.hostname = opts.host;

            client._reconnectCount++;
        }

        return protocols[opts.protocol](client, opts);
    };

    return new adone.net.mqtt.client.Client(wrapper, opts);
};

export default connect;
