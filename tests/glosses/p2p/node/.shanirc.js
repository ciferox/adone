export default (ctx) => {
    ctx.prefix("p2p", "node");

    const {
        async: { parallel },
        p2p: { rendezvous },
        stream: { pull }
    } = adone;

    const srcPath = (...args) => adone.getPath("lib", "glosses", "p2p", "transports", "webrtc_star", ...args);
    const sigServer = require(srcPath("sig-server"));

    const Node = require('./utils/bundle_nodejs.js')
    const {
        getPeerRelay,
        WRTC_RENDEZVOUS_MULTIADDR,
        WS_RENDEZVOUS_MULTIADDR
    } = require('./utils/constants')

    let wrtcRendezvous
    let wsRendezvous
    let node

    ctx.before((done) => {
        parallel([
            (cb) => {
                sigServer.start({
                    port: WRTC_RENDEZVOUS_MULTIADDR.nodeAddress().port
                    // cryptoChallenge: true TODO: needs https://github.com/libp2p/js-libp2p-webrtc-star/issues/128
                })
                    .then(server => {
                        wrtcRendezvous = server;
                        cb();
                    })
                    .catch(cb);
            },
            (cb) => {
                rendezvous.start({
                    port: WS_RENDEZVOUS_MULTIADDR.nodeAddress().port,
                    refreshPeerListIntervalMS: 1000,
                    strictMultiaddr: false,
                    cryptoChallenge: true
                }, (err, _server) => {
                    if (err) {
                        return cb(err)
                    }
                    wsRendezvous = _server
                    cb()
                })
            },
            (cb) => {
                getPeerRelay((err, peerInfo) => {
                    if (err) {
                        return done(err)
                    }

                    node = new Node({
                        peerInfo,
                        config: {
                            relay: {
                                enabled: true,
                                hop: {
                                    enabled: true,
                                    active: true
                                }
                            }
                        }
                    })

                    node.handle('/echo/1.0.0', (protocol, conn) => pull(conn, conn))
                    node.start(cb)
                })
            }
        ], done)
    });

    ctx.after((done) => {
        setTimeout(() =>
            parallel([
                (cb) => wrtcRendezvous.stop().then(cb).catch(cb),
                ...[node, wsRendezvous].map((s) => (cb) => s.stop(cb)),
            ], done),
            2000
        )
    });
};
