const runtime = adone.lazify({
    term: () => new adone.terminal.Terminal(),
    logger: () => {
        const defaultLogger = adone.app.logger.create({
            level: "info"
        });

        return defaultLogger;
    },
    // // netron: () => new adone.netron.Netron(),
    // netron: () => {
    //     const peerInfo = adone.runtime.isOmnitron
    //         ? adone.omnitron.LOCAL_PEER_INFO
    //         : adone.net.p2p.PeerInfo.create(adone.realm.getRootRealm().identity.client);
    //     return new adone.netron.Netron(peerInfo);
    // }
}, adone.asNamespace(exports));

runtime.app = null; // instance of current application
