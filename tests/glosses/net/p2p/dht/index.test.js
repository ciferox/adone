const series = require("async/series");
const timeout = require("async/timeout");
const retry = require("async/retry");
const each = require("async/each");
const waterfall = require("async/waterfall");
import { makePeers, setupDHT, makeValues, teardown } from "./utils";


const {
    math: { random },
    net: { p2p: { multiplex, dht, switch: { Switch }, PeerBook, record: { Record }, transport: { TCP } } },
    lodash: _
} = adone;
const { KadDHT } = dht;
const { utils: kadUtils, constants: c } = adone.private(dht);

const setupDHTs = async (n) => {
    const dhts = await Promise.all(_.times(n, setupDHT));
    return [dhts, dhts.map((d) => d.peerInfo.multiaddrs.toArray()[0]), dhts.map((d) => d.peerInfo.id)];
};

// connect two dhts
const connectNoSync = (a, b) => {
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

// connect two dhts and wait for them to have each other
// in their routing table
const connect = async (a, b) => {
    await connectNoSync(a, b);
    await find(a, b);
    await find(b, a);
};

const bootstrap = function (dhts) {
    dhts.forEach((dht) => {
        dht._bootstrap(3, 10000);
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
    a.forEach((p) => s.add(p.asBase58()));

    return b.filter((p) => !s.has(p.asBase58())).length;
};


describe("dht", "KadDHT", () => {
    let peerInfos;
    let values;

    before(function () {
        this.timeout(10 * 1000);
        peerInfos = makePeers(3);
        values = makeValues(20);
    });

    // Give the nodes some time to finish request
    afterEach(async function () {
        this.timeout(10 * 1000);

        await teardown();
    });

    it("create", () => {
        const sw = new Switch(peerInfos[0], new PeerBook());
        sw.tm.add("tcp", new TCP());
        sw.connection.addStreamMuxer(multiplex);
        sw.connection.reuse();
        const dht = new KadDHT(sw, { kBucketSize: 5 });

        expect(dht).to.have.property("peerInfo").eql(peerInfos[0]);
        expect(dht).to.have.property("switch").eql(sw);
        expect(dht).to.have.property("kBucketSize", 5);
        expect(dht).to.have.property("routingTable");
    });

    it("put - get", async function (done) {
        this.timeout(10 * 1000);

        const dhts = await Promise.all(_.times(2, setupDHT));
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
        ], done);
    });

    it("provides", async function (done) {
        this.timeout(60 * 1000);

        const [dhts, addrs, ids] = await setupDHTs(4);
        await connect(dhts[0], dhts[1]);
        await connect(dhts[1], dhts[2]);
        await connect(dhts[2], dhts[3]);

        waterfall([
            (cb) => each(values, (v, cb) => {
                dhts[3].provide(v.cid, cb);
            }, cb),
            (cb) => {
                let n = 0;
                each(values, (v, cb) => {
                    n = (n + 1) % 3;
                    dhts[n].findProviders(v.cid, 5000, (err, provs) => {
                        assert.notExists(err);
                        expect(provs).to.have.length(1);
                        expect(provs[0].id.id).to.be.eql(ids[3].id);
                        expect(
                            provs[0].multiaddrs.toArray()[0].toString()
                        ).to.be.eql(addrs[3].toString());
                        cb();
                    });
                }, cb);
            }
        ], done);
    });

    it.todo("bootstrap", async function (done) {
        this.timeout(40 * 1000);

        const nDHTs = 20;

        const [dhts] = await setupDHTs(nDHTs);
        await Promise.all(_.times(nDHTs, (i) => connect(dhts[i], dhts[(i + 1) % nDHTs])));

        // ring connect
        bootstrap(dhts);
        waitForWellFormedTables(dhts, 7, 0, 20 * 1000, done);
        done(); // WTF ???
    });

    it("layered get", async function (done) {
        this.timeout(40 * 1000);

        const [dhts] = await setupDHTs(4);
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
                expect(res).to.be.eql(Buffer.from("world"));
                cb();
            }
        ], done);
    });

    it.skip("findPeer", async function (done) {
        this.timeout(40 * 1000);

        const [dhts, addrs, ids] = await setupDHTs(4);
        await connect(dhts[0], dhts[1]);
        await connect(dhts[1], dhts[2]);
        await connect(dhts[2], dhts[3]);

        waterfall([
            (cb) => dhts[0].findPeer(ids[3], 1000, cb),
            (res, cb) => {
                expect(res.id.isEqual(ids[3])).to.eql(true);
                cb();
            }
        ], done);
    });

    it("connect by id to with address in the peerbook ", async function () {
        this.timeout(20 * 1000);

        const dhts = await Promise.all([
            setupDHT(),
            setupDHT()
        ]);

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
    });

    // // TODO fix this
    // it.skip("find peer query", function (done) {
    //     this.timeout(40 * 1000);

    //     setupDHTs(101, (err, dhts, addrs, ids) => {
    //         assert.notExists(err);

    //         const guy = dhts[0];
    //         const others = dhts.slice(1);
    //         const val = Buffer.from("foobar");

    //         series([
    //             (cb) => times(20, (i, cb) => {
    //                 times(16, (j, cb) => {
    //                     const t = 20 + random(0, 79);
    //                     connect(others[i], others[t], cb);
    //                 }, cb);
    //             }, cb),
    //             (cb) => times(20, (i, cb) => {
    //                 connect(guy, others[i], cb);
    //             }, cb),
    //             (cb) => {
    //                 const rtval = kadUtils.convertBuffer(val);
    //                 const rtablePeers = guy.routingTable.closestPeers(rtval, c.ALPHA);
    //                 expect(rtablePeers).to.have.length(3);

    //                 const netPeers = guy.peerBook.getAllAsArray().filter((p) => p.isConnected());
    //                 expect(netPeers).to.have.length(20);

    //                 const rtableSet = {};
    //                 rtablePeers.forEach((p) => {
    //                     rtableSet[p.asBase58()] = true;
    //                 });

    //                 series([
    //                     (cb) => guy.getClosestPeers(val, cb),
    //                     (cb) => kadUtils.sortClosestPeers(ids.slice(1), rtval, cb)
    //                 ], (err, res) => {
    //                     assert.notExists(err);
    //                     const out = res[0];
    //                     const actualClosest = res[1];

    //                     expect(out.filter((p) => !rtableSet[p.asBase58()]))
    //                         .to.not.be.empty();

    //                     expect(out).to.have.length(20);
    //                     const exp = actualClosest.slice(0, 20);

    //                     kadUtils.sortClosestPeers(out, rtval, (err, got) => {
    //                         assert.notExists(err);
    //                         expect(countDiffPeers(exp, got)).to.eql(0);

    //                         cb();
    //                     });
    //                 });
    //             }
    //         ], done);
    //     });
    // });

    it.todo("getClosestPeers", async function (done) {
        this.timeout(40 * 1000);

        const nDHTs = 30;
        const [dhts] = await setupDHTs(nDHTs);

        // ring connect
        await Promise.all(_.times(dhts.length, (i) => connect(dhts[i], dhts[(i + 1) % dhts.length])));

        series([
            (cb) => dhts[1].getClosestPeers(Buffer.from("foo"), cb)
        ], (err, res) => {
            assert.notExists(err);
            expect(res[1]).to.have.length(c.K);
            done();
        });
    });

    describe("getPublicKey", () => {
        it("already known", async function (done) {
            this.timeout(20 * 1000);

            const [dhts, addrs, ids] = await setupDHTs(2);
            dhts[0].peerBook.set(dhts[1].peerInfo);
            dhts[0].getPublicKey(ids[1], (err, key) => {
                assert.notExists(err);
                expect(key).to.be.eql(dhts[1].peerInfo.id.pubKey);
                done();
            });
        });

        it("connected node", async function (done) {
            this.timeout(40 * 1000);

            const [dhts, addrs, ids] = await setupDHTs(2);
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
            ], done);
        });
    });

    it("_nearestPeersToQuery", () => {
        const sw = new Switch(peerInfos[0], new PeerBook());
        sw.tm.add("tcp", new TCP());
        sw.connection.addStreamMuxer(multiplex);
        sw.connection.reuse();
        const dht = new KadDHT(sw);

        dht.peerBook.set(peerInfos[1]);
        dht._add(peerInfos[1]);
        const res = dht._nearestPeersToQuery({ key: "hello" });
        expect(res).to.be.eql([peerInfos[1]]);
    });

    it("_betterPeersToQuery", () => {
        const sw = new Switch(peerInfos[0], new PeerBook());
        sw.tm.add("tcp", new TCP());
        sw.connection.addStreamMuxer(multiplex);
        sw.connection.reuse();
        const dht = new KadDHT(sw);

        dht.peerBook.set(peerInfos[1]);
        dht.peerBook.set(peerInfos[2]);

        dht._add(peerInfos[1]);
        dht._add(peerInfos[2]);

        const res = dht._betterPeersToQuery({ key: "hello" }, peerInfos[1]);
        expect(res).to.be.eql([peerInfos[2]]);
    });

    describe("_verifyRecordLocally", () => {
        it("invalid record (missing public key)", () => {
            const sw = new Switch(peerInfos[0], new PeerBook());
            sw.tm.add("tcp", new TCP());
            sw.connection.addStreamMuxer(multiplex);
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
            sw.connection.addStreamMuxer(multiplex);
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
            sw.connection.addStreamMuxer(multiplex);
            sw.connection.reuse();
            const dht = new KadDHT(sw);

            dht.peerBook.set(peerInfos[1]);

            const record = new Record(
                Buffer.from("hello"),
                Buffer.from("world"),
                peerInfos[1].id
            );
            dht._verifyRecordLocally(Record.deserialize(record.serialize()));
        });
    });
});
