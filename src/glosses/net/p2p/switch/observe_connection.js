const {
    net: { p2p: { Connection } },
    stream: { pull }
} = adone;

module.exports = (transport, protocol, _conn, observer) => {
    const peerInfo = new Promise(async (resolve) => {
        try {
            const peerInfo = await _conn.getPeerInfo();
            resolve(peerInfo);
        } catch (err) {
            //
        }
        const setPeerInfo = _conn.setPeerInfo;
        _conn.setPeerInfo = (pi) => {
            setPeerInfo.call(_conn, pi);
            resolve(pi);
        };
    });

    const stream = {
        source: pull(
            _conn,
            observer.incoming(transport, protocol, peerInfo)),
        sink: pull(
            observer.outgoing(transport, protocol, peerInfo),
            _conn)
    };
    return new Connection(stream, _conn);
};
