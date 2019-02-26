const defaultsDeep = require('@nodeutils/defaults-deep')
const multiaddr = require('multiaddr')

const {
    ipfs: { libp2p: { secio: SECIO, Multiplex, KadDHT, Bootstrap, Node: BaseNode, TCP, WS, MulticastDNS, WebsocketStarMulti } }
} = adone;


class Node extends BaseNode {
    constructor(_options) {
        // this can be replaced once optional listening is supported with the below code. ref: https://github.com/libp2p/interface-transport/issues/41
        // const wsstar = new WebSocketStar({ id: _options.peerInfo.id })
        const wsstarServers = _options.peerInfo.multiaddrs.toArray().map(String).filter(addr => addr.includes('p2p-websocket-star'))
        _options.peerInfo.multiaddrs.replace(wsstarServers.map(multiaddr), '/p2p-websocket-star') // the ws-star-multi module will replace this with the chosen ws-star servers
        const wsstar = new WebsocketStarMulti({ servers: wsstarServers, id: _options.peerInfo.id, ignore_no_online: !wsstarServers.length || _options.wsStarIgnoreErrors })

        const defaults = {
            modules: {
                transport: [
                    TCP,
                    WS,
                    wsstar
                ],
                streamMuxer: [
                    Multiplex
                ],
                connEncryption: [
                    SECIO
                ],
                peerDiscovery: [
                    MulticastDNS,
                    Bootstrap,
                    wsstar.discovery
                ],
                dht: KadDHT
            },
            config: {
                peerDiscovery: {
                    mdns: {
                        enabled: true
                    },
                    bootstrap: {
                        enabled: true
                    },
                    websocketStar: {
                        enabled: true
                    }
                },
                dht: {
                    kBucketSize: 20,
                    // enabled: true,
                    // randomWalk: {
                    //   enabled: true
                    // }
                },
                EXPERIMENTAL: {
                    pubsub: false
                }
            }
        }

        super(defaultsDeep(_options, defaults))
    }
}

module.exports = Node
