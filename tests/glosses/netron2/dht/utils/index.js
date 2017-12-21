const times = require("async/times");
const each = require("async/each");
const series = require("async/series");
const waterfall = require("async/waterfall");

const {
    multi,
    netron2: { CID, PeerId, crypto, multiplex, dht, swarm: { Swarm }, PeerInfo, PeerBook, transport: { TCP } }
} = adone;
const { KadDHT } = dht;

// Creates multiple PeerInfos
exports.makePeers = (n, callback) => {
    times(n, (i, cb) => PeerId.create({ bits: 1024 }, cb), (err, ids) => {
        if (err) {
            return callback(err);
        }
        callback(null, ids.map((i) => new PeerInfo(i)));
    });
};

// TODO break this setupDHT to be a self contained thing.
let nodes = [];

exports.setupDHT = (callback) => {
    exports.makePeers(1, (err, peers) => {
        if (err) {
            return callback(err);
        }

        const p = peers[0];
        p.multiaddrs.add("/ip4/0.0.0.0/tcp/0");

        const swarm = new Swarm(p, new PeerBook());
        swarm.transport.add("tcp", new TCP());
        swarm.connection.addStreamMuxer(multiplex);
        swarm.connection.reuse();

        const dht = new KadDHT(swarm);

        dht.validators.v = {
            func(key, publicKey, callback) {
                setImmediate(callback);
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
    });
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

exports.makeValues = (n, callback) => {
    times(n, (i, cb) => {
        const bytes = crypto.randomBytes(32);

        waterfall([
            (cb) => multi.hash.async(bytes, "sha2-256", cb),
            (h, cb) => cb(null, { cid: new CID(h), value: bytes })
        ], cb);
    }, callback);
};
