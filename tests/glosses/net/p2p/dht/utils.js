const {
    crypto: { Identity },
    multi,
    net: { p2p: { CID, multiplex, dht, switch: { Switch }, PeerInfo, PeerBook, transport: { TCP } } },
    std
} = adone;
const { KadDHT } = dht;

// Creates multiple PeerInfos
export const makePeers = (n) => {
    const peerInfos = [];
    for (let i = 0; i < n; i++) {
        peerInfos.push(new PeerInfo(Identity.create({ bits: 1024 })));
    }

    return peerInfos;
};

// TODO break this setupDHT to be a self contained thing.
let nodes = [];

export const setupDHT = async () => {
    const peers = makePeers(1);

    const p = peers[0];
    p.multiaddrs.add("//ip4/0.0.0.0//tcp/0");

    const sw = new Switch(p, new PeerBook());
    sw.tm.add("tcp", new TCP());
    sw.connection.addStreamMuxer(multiplex);
    sw.connection.reuse();

    const dht = new KadDHT(sw);

    dht.validators.v = {
        func(key, publicKey) {
        },
        sign: false
    };

    dht.selectors.v = (k, records) => 0;

    await sw.start();
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
        await n.switch.stop();
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
