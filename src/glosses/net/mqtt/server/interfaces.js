const { is, std: { fs, http, https, net, tls } } = adone;
const st = require("st");

import Client from "./client";

export function serverFactory(iface, fallback, mosca) {
    const factories = {
        mqtt: mqttFactory,
        mqtts: mqttsFactory,
        http: httpFactory,
        https: httpsFactory
    };

    const type = iface.type; // no fallback
    const factory = factories[type] || type;
    return factory(iface, fallback, mosca);
}

export function mqttFactory(iface, fallback, mosca) {
    return net.createServer(buildWrap(mosca));
}

export function mqttsFactory(iface, fallback, mosca) {
    const credentials = iface.credentials || fallback.credentials;
    if (credentials === undefined) {
        throw new Error("missing credentials for mqtts server");
    }

    if (credentials.keyPath) {
        credentials.key = fs.readFileSync(credentials.keyPath);
    }

    if (credentials.certPath) {
        credentials.cert = fs.readFileSync(credentials.certPath);
    }

    if (credentials.caPaths) {
        credentials.ca = [];
        credentials.caPaths.forEach((caPath) => {
            credentials.ca.push(fs.readFileSync(caPath));
        });
    }

    return tls.createServer(credentials, buildWrap(mosca));
}

export function httpFactory(iface, fallback, mosca) {
    const serve = buildServe(iface, mosca);
    const server = http.createServer(serve);

    mosca.attachHttpServer(server);
    return server;
}

export function httpsFactory(iface, fallback, mosca) {
    const credentials = iface.credentials || fallback.credentials;
    if (credentials === undefined) {
        throw new Error("missing credentials for https server");
    }

    if (credentials.keyPath) {
        credentials.key = fs.readFileSync(credentials.keyPath);
    }

    if (credentials.certPath) {
        credentials.cert = fs.readFileSync(credentials.certPath);
    }

    if (credentials.caPaths) {
        credentials.ca = [];
        credentials.caPaths.forEach((caPath) => {
            credentials.ca.push(fs.readFileSync(caPath));
        });
    }

    const serve = buildServe(iface, mosca);
    const server = https.createServer(credentials, serve);
    mosca.attachHttpServer(server);
    return server;
}

export function buildWrap(mosca) {
    return function wrap(stream) {
        const connection = new adone.net.mqtt.connection.Connection(stream);
        stream.setNoDelay(true);
        new Client(connection, mosca); // REFACTOR?
    };
}

export function buildServe(iface, mosca) {
    const mounts = [];
    const logger = mosca.logger.child({ service: "http bundle" });

    if (iface.bundle) {
        mounts.push(st({
            path: `${__dirname}/../public`,
            url: "/",
            dot: true,
            index: false,
            passthrough: true
        }));
    }

    if (iface.static) {
        mounts.push(st({
            path: iface.static,
            dot: true,
            url: "/",
            index: "index.html",
            passthrough: true
        }));
    }

    return function serve(req, res) {

        logger.info({ req });

        const cmounts = [].concat(mounts);

        res.on("finish", () => {
            logger.info({ res });
        });

        function handle() {
            const mount = cmounts.shift();

            if (mount) {
                mount(req, res, handle);
            } else {
                res.statusCode = 404;
                res.end("Not Found\n");
            }
        }

        handle();
    };
}
