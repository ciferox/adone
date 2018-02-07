const fixtures = require("./test_data/ids.json").infos;

const {
    net: { p2p: { PeerInfo, PeerId } },
    stream: { pull }
} = adone;


export const createInfos = (num) => {
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

export const tryEcho = (conn, callback) => {
    const values = [Buffer.from("echo")];

    pull(
        pull.values(values),
        conn,
        pull.collect((err, _values) => {
            assert.notExists(err);
            expect(_values).to.eql(values);
            callback();
        })
    );
};
