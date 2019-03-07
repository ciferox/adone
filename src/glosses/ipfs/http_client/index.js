const {
    is,
    multiformat: { multiaddr }
} = adone;

const loadCommands = require("./utils/load-commands");
const getConfig = require("./utils/default-config");
const sendRequest = require("./utils/send-request");

// throws if multiaddr can't be converted to a nodeAddress
const toHostAndPort = function (multiaddr) {
    const nodeAddr = multiaddr.nodeAddress();
    return {
        host: nodeAddr.address,
        port: nodeAddr.port
    };
};

export default function httpClient(hostOrMultiaddr, port, opts) {
    // convert all three params to objects that we can merge.
    let hostAndPort = {};

    if (!hostOrMultiaddr) {
        // autoconfigure host and port in browser
        // eslint-disable-next-line adone/no-typeof
        if (typeof self !== "undefined") {
            const split = self.location.host.split(":");
            hostAndPort.host = split[0];
            hostAndPort.port = split[1];
        }
    } else if (multiaddr.isMultiaddr(hostOrMultiaddr)) {
        hostAndPort = toHostAndPort(hostOrMultiaddr);
    } else if (typeof hostOrMultiaddr === "object") {
        hostAndPort = hostOrMultiaddr;
    } else if (is.string(hostOrMultiaddr)) {
        if (hostOrMultiaddr[0] === "/") {
            // throws if multiaddr is malformed or can't be converted to a nodeAddress
            hostAndPort = toHostAndPort(multiaddr(hostOrMultiaddr));
        } else {
            // hostOrMultiaddr is domain or ip address as a string
            hostAndPort.host = hostOrMultiaddr;
        }
    }

    if (port && typeof port !== "object") {
        port = { port };
    }

    const config = Object.assign(getConfig(), hostAndPort, port, opts);
    const requestAPI = sendRequest(config);
    const cmds = loadCommands(requestAPI, config);
    cmds.send = requestAPI;
    cmds.Buffer = Buffer; // Added buffer in types (this should be removed once a breaking change is release)

    return cmds;
}

adone.lazify({
    dht: "./dht",
    refs: "./refs",
    swarm: "./swarm",
    defaultConfig: "./utils/default-config"
}, httpClient, require);
