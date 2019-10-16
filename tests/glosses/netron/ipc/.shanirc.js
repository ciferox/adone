export default (ctx) => {
    ctx.prefix("ipc");

    const pull = require('pull-stream')
    const promisify = require('promisify-es6')
    const mplex = require('pull-mplex')
    const spdy = require('libp2p-spdy')
    const PeerBook = require('peer-book')
    const PeerId = require('peer-id')
    const PeerInfo = require('peer-info')
    const path = require('path')

    const Switch = require(adone.getPath("src/glosses/netron/ipc/switch"))

    const Node = require('./utils/bundle.js')
    const {
        getPeerRelay
    } = require('./utils/constants')

    let node
    let peerInfo
    let switchA
    let switchB

    function echo(protocol, conn) { pull(conn, conn) }
    function idJSON(id) {
        const p = path.join(__dirname, `./switch/test-data/id-${id}.json`)
        return require(p)
    }

    function createSwitchA() {
        return new Promise((resolve, reject) => {
            PeerId.createFromJSON(idJSON(1), (err, id) => {
                if (err) { return reject(err) }

                const peerA = new PeerInfo(id)
                const maA = '/ip4/127.0.0.1/tcp/15337/ws'

                peerA.multiaddrs.add(maA)
                const sw = new Switch(peerA, new PeerBook())

                // sw.transport.add('ws', new WebSockets())
                sw.start((err) => {
                    if (err) { return reject(err) }
                    resolve(sw)
                })
            })
        })
    }

    function createSwitchB() {
        return new Promise((resolve, reject) => {
            PeerId.createFromJSON(idJSON(2), (err, id) => {
                if (err) { return reject(err) }

                const peerB = new PeerInfo(id)
                const maB = '/ip4/127.0.0.1/tcp/15347/ws'

                peerB.multiaddrs.add(maB)
                const sw = new Switch(peerB, new PeerBook())

                // sw.transport.add('ws', new WebSockets())
                sw.connection.addStreamMuxer(mplex)
                sw.connection.addStreamMuxer(spdy)
                sw.connection.reuse()
                sw.handle('/echo/1.0.0', echo)
                sw.start((err) => {
                    if (err) { return reject(err) }
                    resolve(sw)
                })
            })
        })
    }

    ctx.before(async () => {
        [
            peerInfo,
            switchA,
            switchB
        ] = await Promise.all([
            getPeerRelay(),
            createSwitchA(),
            createSwitchB()
        ])

        node = new Node({
            peerInfo
        })

        node.handle('/echo/1.0.0', (protocol, conn) => pull(conn, conn))
        await node.start()
    });

    ctx.after(() => {
        return Promise.all([
            node.stop(),
            promisify(switchA.stop, { context: switchA })(),
            promisify(switchB.stop, { context: switchB })()
        ])
    });
};

