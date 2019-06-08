export default (ctx) => {
    const {
        async: { parallel },
        p2p: { rendezvous },
        stream: { pull }
    } = adone;

    const Node = require('./utils/nodejs_bundle.js')
    const {
        getPeerRelay,
        WS_RENDEZVOUS_MULTIADDR
    } = require('./utils/constants.js')

    let wsRendezvous
    let node

    ctx.before((done) => {
        parallel([
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

                    node.handle('/echo/1.0.0', (_, conn) => pull(conn, conn))
                    node.start(cb)
                })
            }
        ], done)
    });

    ctx.after((done) => {
        setTimeout(() =>
            parallel(
                [node, wsRendezvous].map((s) => (cb) => s.stop(cb)),
                done),
            2000)
    });
}
