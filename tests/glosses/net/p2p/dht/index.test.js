const series = require("async/series");
const times = require("async/times");
const timeout = require("async/timeout");
const retry = require("async/retry");
const each = require("async/each");
const waterfall = require("async/waterfall");

import createPeerInfo from "./utils/create_peer_info";
import createValues from "./utils/create_values";
import TestDHT from "./utils/test_dht";

const {
    math: { random },
    net: { p2p: { muxer: { mplex }, dht, switch: { Switch }, PeerBook, record: { Record }, transport: { TCP } } },
    lodash: _
} = adone;
const { KadDHT } = dht;
const { utils: kadUtils, constants: c } = adone.private(dht);

// connect two dhts
const connectNoSync = function (a, b) {
    const target = _.cloneDeep(b.peerInfo);
    target.id._pubKey = target.id.pubKey;
    target.id._privKey = null;
    return a.switch.connect(target);
};

const find = (a, b) => {
    return new Promise((resolve, reject) => {
        retry({ times: 50, interval: 100 }, (cb) => {
            try {
                const match = a.routingTable.find(b.peerInfo.id);
                if (!match) {
                    throw new Error("not found");
                }

                expect(a.peerBook.get(b.peerInfo).multiaddrs.toArray()[0].toString()).to.eql(b.peerInfo.multiaddrs.toArray()[0].toString());

                cb();
            } catch (err) {
                cb(err);
            }
        }, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};



// connect two dhts and wait for them to have each other in their routing table
const connect = async (a, b) => {
    await connectNoSync(a, b);
    await find(a, b);
    await find(b, a);
};

const bootstrap = function (dhts) {
    dhts.forEach((dht) => {
        dht.randomWalk._walk(3, 10000);
    });
};

const waitForWellFormedTables = function (dhts, minPeers, avgPeers, maxTimeout, callback) {
    timeout((cb) => {
        retry({ times: 50, interval: 200 }, (cb) => {
            let totalPeers = 0;

            const ready = dhts.map((dht) => {
                const rtlen = dht.routingTable.size;
                totalPeers += rtlen;
                if (minPeers > 0 && rtlen < minPeers) {
                    return false;
                }
                const actualAvgPeers = totalPeers / dhts.length;
                if (avgPeers > 0 && actualAvgPeers < avgPeers) {
                    return false;
                }
                return true;
            });

            const done = ready.every(Boolean);
            cb(done ? null : new Error("not done yet"));
        }, cb);
    }, maxTimeout)(callback);
};

const countDiffPeers = function (a, b) {
    const s = new Set();
    a.forEach((p) => s.add(p.toB58String()));

    return b.filter((p) => !s.has(p.toB58String())).length;
};

describe("dht", "KadDHT", () => {
    let peerInfos;
    let values;

    before(function () {
        this.timeout(10 * 1000);

        peerInfos = createPeerInfo(3);
        values = createValues(20);
    });

    it("create", () => {
        const sw = new Switch(peerInfos[0], new PeerBook());
        sw.tm.add("tcp", new TCP());
        sw.connection.addStreamMuxer(mplex);
        sw.connection.reuse();
        const dht = new KadDHT(sw, { kBucketSize: 5 });

        expect(dht).to.have.property("peerInfo").eql(peerInfos[0]);
        expect(dht).to.have.property("switch").eql(sw);
        expect(dht).to.have.property("kBucketSize", 5);
        expect(dht).to.have.property("routingTable");
    });

    it("put - get", function (done) {
        this.timeout(10 * 1000);
        const tdht = new TestDHT();

        tdht.spawn(2, async (err, dhts) => {
            expect(err).to.not.exist();
            const dhtA = dhts[0];
            const dhtB = dhts[1];

            await connect(dhtA, dhtB);
            waterfall([
                (cb) => dhtA.put(Buffer.from("/v/hello"), Buffer.from("world"), cb),
                (cb) => dhtB.get(Buffer.from("/v/hello"), 1000, cb),
                (res, cb) => {
                    expect(res).to.eql(Buffer.from("world"));
                    cb();
                }
            ], (err) => {
                expect(err).to.not.exist();

                tdht.teardown(done);
            });
        });
    });

    it("provides", function (done) {
        this.timeout(20 * 1000);

        const tdht = new TestDHT();

        tdht.spawn(4, async (err, dhts) => {
            expect(err).to.not.exist();
            const addrs = dhts.map((d) => d.peerInfo.multiaddrs.toArray()[0]);
            const ids = dhts.map((d) => d.peerInfo.id);

            await connect(dhts[0], dhts[1]);
            await connect(dhts[1], dhts[2]);
            await connect(dhts[2], dhts[3]);

            series([
                (cb) => each(values, (v, cb) => {
                    dhts[3].provide(v.cid, cb);
                }, cb),
                (cb) => {
                    let n = 0;
                    each(values, (v, cb) => {
                        n = (n + 1) % 3;
                        dhts[n].findProviders(v.cid, 5000, (err, provs) => {
                            expect(err).to.not.exist();
                            expect(provs).to.have.length(1);
                            expect(provs[0].id.id).to.be.eql(ids[3].id);
                            expect(
                                provs[0].multiaddrs.toArray()[0].toString()
                            ).to.equal(
                                addrs[3].toString()
                            );
                            cb();
                        });
                    }, cb);
                }
            ], (err) => {
                expect(err).to.not.exist();
                tdht.teardown(done);
            });
        });
    });

    it("random-walk", function (done) {
        this.timeout(40 * 1000);

        const nDHTs = 20;
        const tdht = new TestDHT();

        tdht.spawn(nDHTs, async (err, dhts) => {
            expect(err).to.not.exist();

            // ring connect
            for (let i = 0; i < nDHTs; i++) {
                await connect(dhts[i], dhts[(i + 1) % nDHTs]); // eslint-disable-line
            }
            series([
                (cb) => {
                    bootstrap(dhts);
                    waitForWellFormedTables(dhts, 7, 0, 20 * 1000, cb);
                    cb();
                }
            ], (err) => {
                expect(err).to.not.exist();
                tdht.teardown(done);
            });
        });
    });

    it("layered get", function (done) {
        this.timeout(40 * 1000);

        const nDHTs = 4;
        const tdht = new TestDHT();

        tdht.spawn(nDHTs, async (err, dhts) => {
            expect(err).to.not.exist();

            await connect(dhts[0], dhts[1]);
            await connect(dhts[1], dhts[2]);
            await connect(dhts[2], dhts[3]);

            waterfall([
                (cb) => dhts[3].put(
                    Buffer.from("/v/hello"),
                    Buffer.from("world"),
                    cb
                ),
                (cb) => dhts[0].get(Buffer.from("/v/hello"), 1000, cb),
                (res, cb) => {
                    expect(res).to.eql(Buffer.from("world"));
                    cb();
                }
            ], (err) => {
                expect(err).to.not.exist();
                tdht.teardown(done);
            });
        });
    });

    it.skip("findPeer", function (done) {
        this.timeout(40 * 1000);

        const nDHTs = 4;
        const tdht = new TestDHT();

        tdht.spawn(nDHTs, async (err, dhts) => {
            expect(err).to.not.exist();

            const ids = dhts.map((d) => d.peerInfo.id);

            await connect(dhts[0], dhts[1]);
            await connect(dhts[1], dhts[2]);
            await connect(dhts[2], dhts[3]);

            waterfall([
                (cb) => dhts[0].findPeer(ids[3], 1000, cb),
                (res, cb) => {
                    expect(res.id.isEqual(ids[3])).to.eql(true);
                    cb();
                }
            ], (err) => {
                expect(err).to.not.exist();
                tdht.teardown(done);
            });
        });
    });

    it("connect by id to with address in the peerbook ", function (done) {
        this.timeout(20 * 1000);

        const nDHTs = 2;
        const tdht = new TestDHT();

        tdht.spawn(nDHTs, async (err, dhts) => {
            expect(err).to.not.exist();
            const dhtA = dhts[0];
            const dhtB = dhts[1];

            const peerA = dhtA.peerInfo;
            const peerB = dhtB.peerInfo;
            dhtA.peerBook.set(peerB);
            dhtB.peerBook.set(peerA);

            await Promise.all([
                dhtA.switch.connect(peerB.id),
                dhtB.switch.connect(peerA.id)
            ]);
            tdht.teardown(done);
        });
    });

    // TODO fix this
    it.skip("find peer query", function (done) {
        this.timeout(40 * 1000);

        const nDHTs = 101;
        const tdht = new TestDHT();

        tdht.spawn(nDHTs, (err, dhts) => {
            expect(err).to.not.exist();

            const ids = dhts.map((d) => d.peerInfo.id);

            const guy = dhts[0];
            const others = dhts.slice(1);
            const val = Buffer.from("foobar");

            series([
                (cb) => times(20, (i, cb) => {
                    times(16, (j, cb) => {
                        const t = 20 + random(79);
                        connect(others[i], others[t], cb);
                    }, cb);
                }, cb),
                (cb) => times(20, (i, cb) => {
                    connect(guy, others[i], cb);
                }, cb),
                (cb) => kadUtils.convertBuffer(val, (err, rtval) => {
                    expect(err).to.not.exist();
                    const rtablePeers = guy.routingTable.closestPeers(rtval, c.ALPHA);
                    expect(rtablePeers).to.have.length(3);

                    const netPeers = guy.peerBook.getAllArray().filter((p) => p.isConnected());
                    expect(netPeers).to.have.length(20);

                    const rtableSet = {};
                    rtablePeers.forEach((p) => {
                        rtableSet[p.toB58String()] = true;
                    });

                    series([
                        (cb) => guy.getClosestPeers(val, cb),
                        (cb) => kadUtils.sortClosestPeers(ids.slice(1), rtval, cb)
                    ], (err, res) => {
                        expect(err).to.not.exist();
                        const out = res[0];
                        const actualClosest = res[1];

                        expect(out.filter((p) => !rtableSet[p.toB58String()]))
                            .to.not.be.empty();

                        expect(out).to.have.length(20);
                        const exp = actualClosest.slice(0, 20);

                        kadUtils.sortClosestPeers(out, rtval, (err, got) => {
                            expect(err).to.not.exist();
                            expect(countDiffPeers(exp, got)).to.eql(0);

                            cb();
                        });
                    });
                })
            ], (err) => {
                expect(err).to.not.exist();
                tdht.teardown(done);
            });
        });
    });

    it.todo("getClosestPeers", function (done) {
        this.timeout(40 * 1000);

        const nDHTs = 30;
        const tdht = new TestDHT();

        tdht.spawn(nDHTs, async (err, dhts) => {
            expect(err).to.not.exist();

            // ring connect
            for (let i = 0; i < dhts.length; i++) {
                await connect(dhts[i], dhts[(i + 1) % dhts.length]); // eslint-disable-line
            }

            series([
                (cb) => dhts[1].getClosestPeers(Buffer.from("foo"), cb)
            ], (err, res) => {
                expect(err).to.not.exist();
                expect(res[1]).to.have.length(c.K);
                tdht.teardown(done);
            });
        });
    });

    describe("getPublicKey", () => {
        it("already known", function (done) {
            this.timeout(20 * 1000);

            const nDHTs = 2;
            const tdht = new TestDHT();

            tdht.spawn(nDHTs, (err, dhts) => {
                expect(err).to.not.exist();

                const ids = dhts.map((d) => d.peerInfo.id);

                dhts[0].peerBook.set(dhts[1].peerInfo);
                dhts[0].getPublicKey(ids[1], (err, key) => {
                    expect(err).to.not.exist();
                    expect(key).to.eql(dhts[1].peerInfo.id.pubKey);
                    tdht.teardown(done);
                });
            });
        });

        it("connected node", function (done) {
            this.timeout(30 * 1000);

            const nDHTs = 2;
            const tdht = new TestDHT();

            tdht.spawn(nDHTs, async (err, dhts) => {
                expect(err).to.not.exist();

                const ids = dhts.map((d) => d.peerInfo.id);

                await connect(dhts[0], dhts[1]);

                waterfall([
                    (cb) => {
                        // remove the pub key to be sure it is fetched
                        const p = dhts[0].peerBook.get(ids[1]);
                        p.id._pubKey = null;
                        dhts[0].peerBook.set(p, true);
                        dhts[0].getPublicKey(ids[1], cb);
                    },
                    (key, cb) => {
                        expect(key.equals(dhts[1].peerInfo.id.pubKey)).to.eql(true);
                        cb();
                    }
                ], (err) => {
                    expect(err).to.not.exist();
                    tdht.teardown(done);
                });
            });
        });
    });

    it.todo("_nearestPeersToQuery", (done) => {
        const sw = new Switch(peerInfos[0], new PeerBook());
        sw.tm.add("tcp", new TCP());
        sw.connection.addStreamMuxer(mplex);
        sw.connection.reuse();
        const dht = new KadDHT(sw);

        dht.peerBook.set(peerInfos[1]);
        series([
            (cb) => dht._add(peerInfos[1], cb),
            (cb) => dht._nearestPeersToQuery({ key: "hello" }, cb)
        ], (err, res) => {
            expect(err).to.not.exist();
            expect(res[1]).to.be.eql([peerInfos[1]]);
            done();
        });
    });

    it.todo("_betterPeersToQuery", (done) => {
        const sw = new Switch(peerInfos[0], new PeerBook());
        sw.tm.add("tcp", new TCP());
        sw.connection.addStreamMuxer(mplex);
        sw.connection.reuse();
        const dht = new KadDHT(sw);

        dht.peerBook.set(peerInfos[1]);
        dht.peerBook.set(peerInfos[2]);

        series([
            (cb) => dht._add(peerInfos[1], cb),
            (cb) => dht._add(peerInfos[2], cb),
            (cb) => dht._betterPeersToQuery({ key: "hello" }, peerInfos[1], cb)
        ], (err, res) => {
            expect(err).to.not.exist();
            expect(res[2]).to.be.eql([peerInfos[2]]);
            done();
        });
    });

    describe("_verifyRecordLocally", () => {
        it("invalid record (missing public key)", () => {
            const sw = new Switch(peerInfos[0], new PeerBook());
            sw.tm.add("tcp", new TCP());
            sw.connection.addStreamMuxer(mplex);
            sw.connection.reuse();
            const dht = new KadDHT(sw);

            // Not putting the peer info into the peerbook
            // dht.peerBook.set(peerInfos[1])

            const record = new Record(
                Buffer.from("hello"),
                Buffer.from("world"),
                peerInfos[1].id
            );

            const enc = record.serializeSigned(peerInfos[1].id.privKey);
            assert.throws(() => dht._verifyRecordLocally(Record.deserialize(enc)), /Missing public key/);
        });

        it("valid record - signed", () => {
            const sw = new Switch(peerInfos[0], new PeerBook());
            sw.tm.add("tcp", new TCP());
            sw.connection.addStreamMuxer(mplex);
            sw.connection.reuse();
            const dht = new KadDHT(sw);

            dht.peerBook.set(peerInfos[1]);

            const record = new Record(
                Buffer.from("hello"),
                Buffer.from("world"),
                peerInfos[1].id
            );

            const enc = record.serializeSigned(peerInfos[1].id.privKey);
            dht._verifyRecordLocally(Record.deserialize(enc));
        });

        it("valid record - not signed", () => {
            const sw = new Switch(peerInfos[0], new PeerBook());
            sw.tm.add("tcp", new TCP());
            sw.connection.addStreamMuxer(mplex);
            sw.connection.reuse();
            const dht = new KadDHT(sw);

            dht.peerBook.set(peerInfos[1]);

            const record = new Record(
                Buffer.from("hello"),
                Buffer.from("world"),
                peerInfos[1].id
            );

            const enc = record.serialize();
            dht._verifyRecordLocally(Record.deserialize(enc));
        });
    });
});
