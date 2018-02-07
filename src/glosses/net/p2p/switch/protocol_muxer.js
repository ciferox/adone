const {
    net: { p2p: { multistream } }
} = adone;

module.exports = function protocolMuxer(protocols, conn) {
    const ms = new multistream.Listener();

    for (const protocol of Object.keys(protocols)) {
        if (protocol) {
            ms.addHandler(protocol, protocols[protocol].handlerFunc, protocols[protocol].matchFunc);
        }
    }

    ms.handle(conn, (err) => {
        if (err) {
            // the multistream handshake failed
        }
    });
};
