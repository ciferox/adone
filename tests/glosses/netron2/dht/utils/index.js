const each = require("async/each");
const series = require("async/series");

const {
    multi,
    netron2: { CID, PeerId, multiplex, dht, swarm: { Swarm }, PeerInfo, PeerBook, transport: { TCP } },
    std
} = adone;
const { KadDHT } = dht;

// Creates multiple PeerInfos
exports.makePeers = (n) => {
    const ids = [];
    for (let i = 0; i < n; i++) {
        ids.push(new PeerInfo(PeerId.create({ bits: 1024 })));
    }

    return ids;
};

// TODO break this setupDHT to be a self contained thing.
let nodes = [];

exports.setupDHT = (callback) => {
    try {
        const peers = exports.makePeers(1);

        const p = peers[0];
        p.multiaddrs.add("/ip4/0.0.0.0/tcp/0");

        const swarm = new Swarm(p, new PeerBook());
        swarm.transport.add("tcp", new TCP());
        swarm.connection.addStreamMuxer(multiplex);
        swarm.connection.reuse();

        const dht = new KadDHT(swarm);

        dht.validators.v = {
            func(key, publicKey) {
            },
            sign: false
        };

        dht.selectors.v = (k, records) => 0;

        series([
            (cb) => swarm.listen(cb),
            (cb) => dht.start(cb)
        ], (err) => {
            if (err) {
                return callback(err);
            }
            nodes.push(dht);
            callback(null, dht);
        });
    } catch (err) {
        return callback(err);
    }
};

exports.teardown = (callback) => {
    each(nodes, (n, cb) => {
        series([
            (cb) => n.stop(cb),
            (cb) => n.swarm.close(cb)
        ], cb);
    }, (err) => {
        nodes = [];
        callback(err);
    });
};

exports.makeValues = (n) => {
    const values = [];
    for (let i = 0; i < n; i++) {
        const bytes = std.crypto.randomBytes(32);
        const h = multi.hash.create(bytes, "sha2-256");
        values.push({ cid: new CID(h), value: bytes });
    }
    return values;
};
