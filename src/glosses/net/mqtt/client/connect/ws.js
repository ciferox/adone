const WSS_OPTIONS = [
    "rejectUnauthorized",
    "ca",
    "cert",
    "key",
    "pfx",
    "passphrase"
];

const buildBuilder = (client, opts) => {
    const websocketSubProtocol = (opts.protocolId === "MQIsdp") && (opts.protocolVersion === 3) ? "mqttv3.1" : "mqtt";

    if (!opts.hostname) {
        opts.hostname = "localhost";
    }
    if (!opts.port) {
        if (opts.protocol === "wss") {
            opts.port = 443;
        } else {
            opts.port = 80;
        }
    }
    if (!opts.path) {
        opts.path = "/";
    }

    if (!opts.wsOptions) {
        opts.wsOptions = {};
    }
    if (opts.protocol === "wss") {
        // Add cert/key/ca etc options
        WSS_OPTIONS.forEach((prop) => {
            if (opts.hasOwnProperty(prop) && !opts.wsOptions.hasOwnProperty(prop)) {
                opts.wsOptions[prop] = opts[prop];
            }
        });
    }

    let url = `${opts.protocol}://${opts.hostname}:${opts.port}${opts.path}`;
    if (adone.is.function(opts.transformWsUrl)) {
        url = opts.transformWsUrl(url, opts, client);
    }
    
    return adone.net.ws.stream.createClient(url, [websocketSubProtocol], opts.wsOptions);
};

export default buildBuilder;
