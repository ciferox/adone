const buildBuilder = (client, opts) => {
    opts.port = opts.port || 1883;
    opts.hostname = opts.hostname || opts.host || "localhost";

    const port = opts.port;
    const host = opts.hostname;

    return adone.std.net.createConnection(port, host);
};

export default buildBuilder;
