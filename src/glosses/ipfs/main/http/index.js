const Hapi = require("hapi");
const Pino = require("hapi-pino");
const debug = require("debug");
const promisify = require("promisify-es6");
const toMultiaddr = require("uri-to-multiaddr");

const IPFS = require("../core");
const errorHandler = require("./error-handler");

const {
    p2p: { Bootstrap, WebRTCStar, TCP, WS, MulticastDNS },
    multiformat: { multiaddr, multiaddrToUri: toUri }
} = adone;

const hapiInfoToMultiaddr = function (info) {
    let hostname = info.host;
    let uri = info.uri;
    // ipv6 fix
    if (hostname.includes(":") && !hostname.startsWith("[")) {
        // hapi 16 produces invalid URI for ipv6
        // we fix it here by restoring missing square brackets
        hostname = `[${hostname}]`;
        uri = uri.replace(`://${info.host}`, `://${hostname}`);
    }
    return toMultiaddr(uri);
};

function serverCreator(serverAddrs, createServer, ipfs) {
    serverAddrs = serverAddrs || [];
    // just in case the address is just string
    serverAddrs = Array.isArray(serverAddrs) ? serverAddrs : [serverAddrs];

    const processServer = async (address) => {
        const addrParts = address.split("/");
        const server = await createServer(addrParts[2], addrParts[4], ipfs);
        await server.start();
        server.info.ma = hapiInfoToMultiaddr(server.info);
        return server;
    };

    return Promise.all(serverAddrs.map(processServer));
}

class HttpApi {
    constructor(options) {
        this._options = options || {};
        this._log = debug("ipfs:http-api");
        this._log.error = debug("ipfs:http-api:error");

        if (process.env.IPFS_MONITORING) {
            // Setup debug metrics collection
            const prometheusClient = require("prom-client");
            const prometheusGcStats = require("prometheus-gc-stats");
            const collectDefaultMetrics = prometheusClient.collectDefaultMetrics;
            collectDefaultMetrics({ timeout: 5000 });
            prometheusGcStats(prometheusClient.register)();
        }
    }

    async start() {
        this._log("starting");

        const libp2p = { modules: {} };

        // Attempt to use any of the WebRTC versions available globally
        let electronWebRTC;
        let wrtc;
        try {
            electronWebRTC = require("electron-webrtc")();
        } catch (err) {
            this._log("failed to load optional electron-webrtc dependency");
        }
        try {
            wrtc = require("wrtc");
        } catch (err) {
            this._log("failed to load optional webrtc dependency");
        }

        if (wrtc || electronWebRTC) {
            const using = wrtc ? "wrtc" : "electron-webrtc";
            this._log(`Using ${using} for webrtc support`);
            const wstar = new WebRTCStar({ wrtc: (wrtc || electronWebRTC) });
            libp2p.modules.transport = [TCP, WS, wstar];
            libp2p.modules.peerDiscovery = [MulticastDNS, Bootstrap, wstar.discovery];
        }

        // start the daemon
        const ipfsOpts = Object.assign({ init: false }, this._options, { start: true, libp2p });
        const ipfs = new IPFS(ipfsOpts);

        await new Promise((resolve, reject) => {
            ipfs.once("error", (err) => {
                this._log("error starting core", err);
                err.code = "ENOENT";
                reject(err);
            });
            ipfs.once("start", resolve);
        });

        this._ipfs = ipfs;

        const config = await ipfs.config.get();
        config.Addresses = config.Addresses || {};

        const apiAddrs = config.Addresses.API;
        this._apiServers = await serverCreator(apiAddrs, this._createApiServer, ipfs);

        // for the CLI to know the where abouts of the API
        if (this._apiServers.length) {
            await promisify(ipfs._repo.apiAddr.set)(this._apiServers[0].info.ma);
        }

        const gatewayAddrs = config.Addresses.Gateway;
        this._gatewayServers = await serverCreator(gatewayAddrs, this._createGatewayServer, ipfs);

        this._apiServers.forEach((apiServer) => {
            ipfs._print("API listening on %s", apiServer.info.ma);
        });
        this._gatewayServers.forEach((gatewayServer) => {
            ipfs._print("Gateway (read only) listening on %s", gatewayServer.info.ma);
        });
        this._apiServers.forEach((apiServer) => {
            ipfs._print("Web UI available at %s", `${toUri(apiServer.info.ma)}/webui`);
        });
        this._log("started");
        return this;
    }

    async _createApiServer(host, port, ipfs) {
        const server = Hapi.server({
            host,
            port,
            // CORS is enabled by default
            // TODO: shouldn't, fix this
            routes: {
                cors: true
            }
        });
        server.app.ipfs = ipfs;

        await server.register({
            plugin: Pino,
            options: {
                prettyPrint: process.env.NODE_ENV !== "production",
                logEvents: ["onPostStart", "onPostStop", "response", "request-error"],
                level: process.env.DEBUG ? "debug" : "error"
            }
        });

        const setHeader = (key, value) => {
            server.ext("onPreResponse", (request, h) => {
                const { response } = request;
                if (response.isBoom) {
                    response.output.headers[key] = value;
                } else {
                    response.header(key, value);
                }
                return h.continue;
            });
        };

        // Set default headers
        setHeader("Access-Control-Allow-Headers",
            "X-Stream-Output, X-Chunked-Output, X-Content-Length");
        setHeader("Access-Control-Expose-Headers",
            "X-Stream-Output, X-Chunked-Output, X-Content-Length");

        server.route(require("./api/routes"));

        errorHandler(server);

        return server;
    }

    async _createGatewayServer(host, port, ipfs) {
        const server = Hapi.server({ host, port });
        server.app.ipfs = ipfs;

        await server.register({
            plugin: Pino,
            options: {
                prettyPrint: Boolean(process.env.DEBUG),
                logEvents: ["onPostStart", "onPostStop", "response", "request-error"],
                level: process.env.DEBUG ? "debug" : "error"
            }
        });

        server.route(require("./gateway/routes"));

        return server;
    }

    get apiAddr() {
        if (!this._apiServers || !this._apiServers.length) {
            throw new Error("API address unavailable - server is not started");
        }
        return multiaddr(`/ip4/127.0.0.1/tcp/${this._apiServers[0].info.port}`);
    }

    async stop() {
        this._log("stopping");
        const stopServers = (servers) => Promise.all((servers || []).map((s) => s.stop()));
        await Promise.all([
            stopServers(this._apiServers),
            stopServers(this._gatewayServers),
            this._ipfs && this._ipfs.stop()
        ]);
        this._log("stopped");
        return this;
    }
}

module.exports = HttpApi;
