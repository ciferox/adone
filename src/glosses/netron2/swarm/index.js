adone.lazifyPrivate({
    LimitDialer: "./limit_dialer"
}, exports, require);

const each = require("async/each");
const series = require("async/series");
const transport = require("./transport");
const connection = require("./connection");
const getPeerInfo = require("./get_peer_info");
const dial = require("./dial");
const protocolMuxer = require("./protocol_muxer");
const plaintext = require("./plaintext");

export class Swarm extends adone.std.events.EventEmitter {
    constructor(peerInfo, peerBook) {
        super();

        if (!peerInfo) {
            throw new adone.x.NotValid("You must provide a `peerInfo`");
        }

        if (!peerBook) {
            throw new adone.x.NotValid("You must provide a `peerBook`");
        }

        this._peerInfo = peerInfo;
        this._peerBook = peerBook;

        this.setMaxListeners(Infinity);
        // transports --
        // { key: transport }; e.g { tcp: <tcp> }
        this.transports = {};

        // connections --
        // { peerIdB58: { conn: <conn> }}
        this.conns = {};

        // {
        //   peerIdB58: {
        //     muxer: <muxer>
        //     conn: <transport socket> // to extract info required for the Identify Protocol
        //   }
        // }
        this.muxedConns = {};

        // { protocol: handler }
        this.protocols = {};

        // { muxerCodec: <muxer> } e.g { '/spdy/0.3.1': spdy }
        this.muxers = {};

        // is the Identify protocol enabled?
        this.identify = false;

        // Crypto details
        this.crypto = plaintext;

        this.transport = transport(this);
        this.connection = connection(this);

        // higher level (public) API
        this.dial = dial(this);

        this.handle(this.crypto.tag, (protocol, conn) => {
            const peerId = this._peerInfo.id;
            const wrapped = this.crypto.encrypt(peerId, conn, undefined, () => {});
            return protocolMuxer(this.protocols, wrapped);
        });
    }

    hasTransports() {
        const transports = Object.keys(this.transports).filter((t) => t !== "Circuit");
        return transports && transports.length > 0;
    }

    availableTransports(pi) {
        const myAddrs = pi.multiaddrs.toArray();
        const myTransports = Object.keys(this.transports);

        // Only listen on transports we actually have addresses for
        return myTransports.filter((ts) => this.transports[ts].filter(myAddrs).length > 0)
            // push Circuit to be the last proto to be dialed
            .sort((a) => a === "Circuit" ? 1 : 0);
    }

    // Start listening on all available transports
    listen(callback) {
        each(this.availableTransports(this._peerInfo), (ts, cb) => {
            // Listen on the given transport
            this.transport.listen(ts, {}, null, cb);
        }, callback);
    }

    handle(protocol, handlerFunc, matchFunc) {
        this.protocols[protocol] = {
            handlerFunc,
            matchFunc
        };
    }

    unhandle(protocol) {
        if (this.protocols[protocol]) {
            delete this.protocols[protocol];
        }
    }

    hangUp(peer, callback) {
        const peerInfo = getPeerInfo(peer, this.peerBook);
        const key = peerInfo.id.toB58String();
        if (this.muxedConns[key]) {
            const muxer = this.muxedConns[key].muxer;
            muxer.once("close", () => {
                delete this.muxedConns[key];
                callback();
            });
            muxer.end();
        } else {
            callback();
        }
    }

    close(callback) {
        series([
            (cb) => each(this.muxedConns, (conn, cb) => {
                // if (!conn) {
                //     return cb();
                // }
                conn.muxer.end((err) => {
                    // If OK things are fine, and someone just shut down
                    if (err && err.message !== "Fatal error: OK") {
                        return cb(err);
                    }
                    cb();
                });
            }, cb),
            (cb) => {
                each(this.transports, (transport, cb) => {
                    each(transport.listeners, (listener, cb) => {
                        listener.close(cb);
                    }, cb);
                }, cb);
            }
        ], callback);
    }
}
