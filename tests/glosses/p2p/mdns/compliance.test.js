const {
    p2p: { PeerInfo, MulticastDNS }
} = adone;

const test = require("../peer_discovery/interface");

let mdns;

const common = {
    async setup() {
        const peerInfo = await PeerInfo.create();
        mdns = new MulticastDNS({
            peerInfo,
            broadcast: false,
            port: 50001,
            compat: true
        });

        return mdns;
    }
};

// use all of the test suits
test(common);
