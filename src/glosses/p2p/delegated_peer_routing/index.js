const {
    is,
    p2p: { PeerId, PeerInfo },
    ipfs: { httpClient: { dht, defaultConfig } }
} = adone;

const DEFAULT_MAX_TIMEOUT = 30e3; // 30 second default
const DEFAULT_IPFS_API = {
    protocol: "https",
    port: 443,
    host: "ipfs.io"
};

const peerNotFoundError = (id) => {
    return new Error(`Peer "${id}" not found`);
};

export default class DelegatedPeerRouting {
    constructor(api) {
        this.api = Object.assign({}, defaultConfig(), DEFAULT_IPFS_API, api);
        this.dht = dht(this.api);
    }

    /**
     * Attempts to find the given peer
     *
     * @param {PeerID} id
     * @param {object} options
     * @param {number} options.maxTimeout How long the query can take. Defaults to 30 seconds
     * @param {function(Error, PeerInfo)} callback
     * @returns {void}
     */
    findPeer(id, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        } else if (is.number(options)) { // This will be deprecated in a next release
            options = {
                maxTimeout: options
            };
        } else {
            options = options || {};
        }

        if (PeerId.isPeerId(id)) {
            id = id.toB58String();
        }

        options.maxTimeout = options.maxTimeout || DEFAULT_MAX_TIMEOUT;

        this.dht.findPeer(id, {
            timeout: `${options.maxTimeout}ms`// The api requires specification of the time unit (s/ms)
        }, (err, results) => {
            if (err) {
                return callback(err);
            }

            // cleanup result from ipfs-api
            const actual = results.filter((res) => Boolean(res.Responses));

            if (actual.length === 0) {
                return callback(peerNotFoundError(id));
            }

            const wantedResponse = actual.find((el) => el.Type === 2);
            if (is.undefined(wantedResponse)) {
                return callback(peerNotFoundError(id));
            }
            const details = wantedResponse.Responses[0];
            const info = new PeerInfo(
                PeerId.createFromB58String(details.ID)
            );
            details.Addrs.forEach((addr) => info.multiaddrs.add(addr));

            // there should be only one of these
            callback(null, info);
        });
    }
}
