const defaultsDeep = require('@nodeutils/defaults-deep')
const multiaddr = require('multiaddr')

const {
    p2p: { secio: SECIO, KadDHT, Bootstrap, Multiplex, WS, WebRTCStar, WebsocketStarMulti }
} = adone;

class Node extends libp2p {
    constructor(_options) {
        const wrtcstar = new WebRTCStar({ id: _options.peerInfo.id })

        // this can be replaced once optional listening is supported with the below code. ref: https://github.com/libp2p/interface-transport/issues/41
        // const wsstar = new WebSocketStar({ id: _options.peerInfo.id })
        const wsstarServers = _options.peerInfo.multiaddrs.toArray().map(String).filter(addr => addr.includes('p2p-websocket-star'))
        _options.peerInfo.multiaddrs.replace(wsstarServers.map(multiaddr), '/p2p-websocket-star') // the ws-star-multi module will replace this with the chosen ws-star servers
        const wsstar = new WebsocketStarMulti({ servers: wsstarServers, id: _options.peerInfo.id, ignore_no_online: !wsstarServers.length || _options.wsStarIgnoreErrors })

        const defaults = {
            modules: {
                transport: [
                    WS,
                    wrtcstar,
                    wsstar
                ],
                streamMuxer: [
                    Multiplex
                ],
                connEncryption: [
                    SECIO
                ],
                peerDiscovery: [
                    wrtcstar.discovery,
                    wsstar.discovery,
                    Bootstrap
                ],
                dht: KadDHT
            },
            config: {
                peerDiscovery: {
                    bootstrap: {
                        enabled: true
                    },
                    webRTCStar: {
                        enabled: true
                    },
                    websocketStar: {
                        enabled: true
                    }
                },
                dht: {
                    enabled: false
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
