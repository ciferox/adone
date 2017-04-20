const { is } = adone;

export const isLocal = (port, host) => ((is.nil(port) && is.nil(host)) || is.string(port));

export const normalizeAddr = (port, host, defaultPort) => {
    if (is.string(port)) {
        port = adone.std.url.parse(port);

        if (port.pathname) {
            host = null;
            port = port.pathname;
        } else {
            host = port.hostname || "localhost";
            port = Number.parseInt(port.port, 10);
        }
    } else if (is.object(port)) {
        host = port.host || "localhost";
        port = port.port || 1024;
    } else {
        if (is.nil(port)) {
            port = defaultPort || 1024;
        }
        host = host || "localhost";
    }

    return [port, host];
};

export const isFreePort = (port) => {
    return new Promise((resolve) => {
        const socket = new adone.std.net.Server();
        socket.listen(port);
        socket.once("error", () => {
            resolve(false);
        }).once("listening", () => {
            socket.close(() => resolve(true));
        });
    });
};

export const getFreePort = async ({
    exclude = null,
    lbound = 40000,
    rbound = 65000,
    rounds = 1000
} = {}) => {
    while (rounds--) {
        const port = Math.floor(Math.random() * (rbound - lbound + 1)) + lbound;
        if (exclude && exclude.has(port)) {
            continue;
        }
        if (await isFreePort(port)) {  // eslint-disable-line no-await-in-loop
            return port;
        }
    }
    return null;  // or throw?
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
