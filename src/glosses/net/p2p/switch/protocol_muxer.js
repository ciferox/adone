const observeConn = require("./observe_connection");

const {
    net: { p2p: { multistream } }
} = adone;

module.exports = function protocolMuxer(protocols, observer) {
    return (transport) => (_parentConn) => {
        const parentConn = observeConn(transport, null, _parentConn, observer);
        const ms = new multistream.Listener();

        Object.keys(protocols).forEach((protocol) => {
            if (!protocol) {
                return;
            }

            const handler = (protocolName, _conn) => {
                const protocol = protocols[protocolName];
                if (protocol) {
                    const handlerFunc = protocol && protocol.handlerFunc;
                    if (handlerFunc) {
                        const conn = observeConn(null, protocolName, _conn, observer);
                        handlerFunc(protocol, conn);
                    }
                }
            };

            ms.addHandler(protocol, handler, protocols[protocol].matchFunc);
        });

        ms.handle(parentConn, (err) => {
            if (err) {
                // the multistream handshake failed
            }
        });
    };
};
