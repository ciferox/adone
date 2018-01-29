const fixtures = require("./test-data/ids.json").infos;

const {
    net: { p2p: { PeerInfo, PeerId } }
} = adone;


exports.createInfos = (num) => {
    const infos = [];

    for (let i = 0; i < num; i++) {
        let peerInfo;
        if (fixtures[i]) {
            peerInfo = new PeerInfo(PeerId.createFromJSON(fixtures[i].id));
        } else {
            peerInfo = PeerInfo.create();
        }
        infos.push(peerInfo);
    }

    return infos;
};
