const each = require("async/each");
const series = require("async/series");

const {
    multi,
    netron2: { CID, PeerId, multiplex, dht, swarm: { Swarm }, PeerInfo, PeerBook, transport: { TCP } },
    std,
    vendor: { lodash: _ }
} = adone;
const { KadDHT } = dht;

// Creates multiple PeerInfos
export const makePeers = (n) => {
    const ids = [];
    for (let i = 0; i < n; i++) {
        ids.push(new PeerInfo(PeerId.create({ bits: 1024 })));
    }

    return ids;
};

// TODO break this setupDHT to be a self contained thing.
let nodes = [];

export const setupDHT = async () => {
    const peers = makePeers(1);

    const p = peers[0];
    p.multiaddrs.add("/ip4/0.0.0.0/tcp/0");

    const swarm = new Swarm(p, new PeerBook());
    swarm.tm.add("tcp", new TCP());
    swarm.connection.addStreamMuxer(multiplex);
    swarm.connection.reuse();

    const dht = new KadDHT(swarm);

    dht.validators.v = {
        func(key, publicKey) {
        },
        sign: false
    };

    dht.selectors.v = (k, records) => 0;

    await swarm.listen();
    await new Promise((resolve, reject) => {
        dht.start((err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });

    nodes.push(dht);

    return dht;
};

export const teardown = async () => {
    await Promise.all(nodes.map(async (n) => {
        await new Promise((resolve) => n.stop(resolve));
        await n.swarm.close();
    }));

    nodes = [];
};

export const makeValues = (n) => {
    const values = [];
    for (let i = 0; i < n; i++) {
        const bytes = std.crypto.randomBytes(32);
        const h = multi.hash.create(bytes, "sha2-256");
        values.push({ cid: new CID(h), value: bytes });
    }
    return values;
};
