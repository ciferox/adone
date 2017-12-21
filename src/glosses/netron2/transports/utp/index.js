const {
    net: { utp }
} = adone;


export const dial = function (multiaddr, options) {
    options.ready = options.ready || function noop() { };
    const opts = multiaddr.toOptions();
    const client = utp.connect(opts.port, opts.host);

    client.once("connect", options.ready);

    return client;
};

export const createListener = utp.createServer;
