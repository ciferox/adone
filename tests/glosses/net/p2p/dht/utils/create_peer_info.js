const {
    crypto: { Identity },
    net: { p2p: { PeerInfo } }
} = adone;

// Creates multiple PeerInfos
export default function (n) {
    const ids = [];
    for (let i = 0; i < n; i++) {
        ids.push(Identity.create({ bits: 512 })); 
    }
    return ids.map((i) => new PeerInfo(i));
}
