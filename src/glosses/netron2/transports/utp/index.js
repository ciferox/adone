const {
    net: { utp }
} = adone;


export const connect = function (multiaddr, options) {
    options.ready = options.ready || adone.noop;
    const opts = multiaddr.toOptions();
    const client = utp.connect(opts.port, opts.host);

    client.once("connect", options.ready);

    return client;
};

export const createListener = utp.createServer;
