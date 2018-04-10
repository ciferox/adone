const each = require("async/each");
const series = require("async/series");
const times = require("async/times");

import createPeerInfo from "./create_peer_info";

const {
    net: { p2p: { muxer: { mplex }, dht: { KadDHT }, switch: { Switch }, PeerBook, transport: { TCP } } },
} = adone;

export default class TestDHT {
    constructor() {
        this.nodes = [];
    }

    spawn(n, callback) {
        times(n, (i, cb) => this._spawnOne().catch(cb).then((d) => cb(null, d)), (err, dhts) => {
            if (err) {
                return callback(err);
            }
            callback(null, dhts);
        });
    }

    async _spawnOne() {
        const peers = createPeerInfo(1);
        const p = peers[0];
        p.multiaddrs.add("//ip4/127.0.0.1//tcp/0");

        const sw = new Switch(p, new PeerBook());
        sw.tm.add("tcp", new TCP());
        sw.connection.addStreamMuxer(mplex);
        sw.connection.reuse();

        const dht = new KadDHT(sw);

        dht.validators.v = {
            func(key, publicKey) {
            },
            sign: false
        };

        dht.selectors.v = (k, records) => 0;

        await sw.start();
        await new Promise((resolve, reject) => {
            dht.start((err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
        this.nodes.push(dht);
        return dht;
    }

    teardown(callback) {
        each(this.nodes, (n, cb) => {
            series([
                (cb) => n.stop(cb),
                (cb) => n.switch.stop().catch(cb).then(() => cb())
            ], cb);
        }, (err) => {
            this.nodes = [];
            callback(err);
        });
    }
}
