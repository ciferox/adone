const { is } = adone;

export const isLocal = (port, host) => ((is.nil(port) && is.nil(host)) || is.string(port));

export const normalizeAddr = (port, host, defaultPort) => {
    if (is.string(port)) {
        port = adone.std.url.parse(port);

        if (port.pathname) {
            host = null;
            port = port.pathname;
        } else {
            host = port.hostname || "0.0.0.0";
            port = Number.parseInt(port.port, 10);
        }
    } else if (is.object(port)) {
        host = port.host || "0.0.0.0";
        port = port.port || 1024;
    } else {
        if (is.nil(port)) {
            port = defaultPort || 1024;
        }
        host = host || "0.0.0.0";
    }

    return [port, host];
};

export const humanizeAddr = (protocol, port, host) => {
    let addr;
    protocol = protocol || "tcp:";
    if (!protocol.endsWith(":")) {
        protocol += ":";
    }
    if (is.number(port)) {
        if (is.nil(host)) {
            host = "0.0.0.0";
        }
        addr = adone.sprintf("%s//%s:%d", protocol, host, port);
    } else {
        addr = adone.sprintf("%s//%s", protocol, port);
    }
    return addr;
};

export const isFreePort = (options) => {
    return new Promise((resolve) => {
        const server = adone.std.net.createServer();
        server.once("error", () => resolve(false));
        server.listen(options, () => {
            server.close(() => resolve(true));
        });
    });
};

export const getPort = async ({ port, host, exclude = null, lbound = 1025, rbound = 65535, rounds = rbound - lbound } = {}) => {
    if (is.number(port)) {
        if (await isFreePort({ port, host })) {
            return port;
        } 
        throw new adone.x.Network(`Port ${port} is busy`);
    }

    const isExcluded = is.array(exclude) ? (port) => exclude.includes(port) : adone.falsely;

    for ( ; rounds >= 0; ) {
        const port = adone.math.random(lbound, rbound + 1);
        if (isExcluded(port)) {
            continue;
        }
        if (await isFreePort({ port, host })) { // eslint-disable-line no-await-in-loop
            return port;
        }
        --rounds;
    }
    throw new adone.x.NotFound("No free port");
};

export const ignoredErrors = [
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "ENETDOWN",
    "EPIPE",
    "ENOENT"
];
