const series = require("async/series");
const times = require("async/times");
const parallel = require("async/parallel");
const timeout = require("async/timeout");
const retry = require("async/retry");
const each = require("async/each");
const waterfall = require("async/waterfall");
const utils = require("./utils");

const makePeers = utils.makePeers;
const setupDHT = utils.setupDHT;
const makeValues = utils.makeValues;

const {
    math: { random },
    netron2: { multiplex, dht, swarm: { Swarm }, PeerBook, record: { Record }, transport: { TCP } },
    vendor: { lodash: _ }
} = adone;
const { KadDHT } = dht;
const { utils: kadUtils, constants: c } = adone.private(dht);

const setupDHTs = function (n, callback) {
    times(n, (i, cb) => setupDHT(cb), (err, dhts) => {
        if (err) {
            return callback(err);
        }
        callback(null, dhts, dhts.map((d) => d.peerInfo.multiaddrs.toArray()[0]), dhts.map((d) => d.peerInfo.id));
    });
};

// connect two dhts
const connectNoSync = function (a, b, callback) {
    const target = _.cloneDeep(b.peerInfo);
    target.id._pubKey = target.id.pubKey;
    target.id._privKey = null;
    a.swarm.dial(target, callback);
};

const find = function (a, b, cb) {
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
    }, cb);
};

// connect two dhts and wait for them to have each other
// in their routing table
const connect = function (a, b, callback) {
    series([
        (cb) => connectNoSync(a, b, cb),
        (cb) => find(a, b, cb),
        (cb) => find(b, a, cb)
    ], (err) => callback(err));
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


describe("KadDHT", () => {
    let peerInfos;
    let values;

    before(function () {
        this.timeout(10 * 1000);
        peerInfos = makePeers(3);
        values = makeValues(20);
    });

    // Give the nodes some time to finish request
    afterEach(function (done) {
        this.timeout(10 * 1000);

        utils.teardown(done);
    });

    it("create", () => {
        const swarm = new Swarm(peerInfos[0], new PeerBook());
        swarm.transport.add("tcp", new TCP());
        swarm.connection.addStreamMuxer(multiplex);
        swarm.connection.reuse();
        const dht = new KadDHT(swarm, { kBucketSize: 5 });

        expect(dht).to.have.property("peerInfo").eql(peerInfos[0]);
        expect(dht).to.have.property("swarm").eql(swarm);
        expect(dht).to.have.property("kBucketSize", 5);
        expect(dht).to.have.property("routingTable");
    });

    it("put - get", function (done) {
        this.timeout(10 * 1000);

        times(2, (i, cb) => setupDHT(cb), (err, dhts) => {
            assert.notExists(err);
            const dhtA = dhts[0];
            const dhtB = dhts[1];

            waterfall([
                (cb) => connect(dhtA, dhtB, cb),
                (cb) => dhtA.put(Buffer.from("/v/hello"), Buffer.from("world"), cb),
                (cb) => dhtB.get(Buffer.from("/v/hello"), 1000, cb),
                (res, cb) => {
                    expect(res).to.eql(Buffer.from("world"));
                    cb();
                }
            ], done);
        });
    });

    it("provides", function (done) {
        this.timeout(60 * 1000);

        setupDHTs(4, (err, dhts, addrs, ids) => {
            assert.notExists(err);
            waterfall([
                (cb) => connect(dhts[0], dhts[1], cb),
                (cb) => connect(dhts[1], dhts[2], cb),
                (cb) => connect(dhts[2], dhts[3], cb),
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
    });

    it("bootstrap", function (done) {
        this.timeout(40 * 1000);

        const nDHTs = 20;

        setupDHTs(nDHTs, (err, dhts) => {
            assert.notExists(err);

            waterfall([
                // ring connect
                (cb) => times(nDHTs, (i, cb) => {
                    connect(dhts[i], dhts[(i + 1) % nDHTs], cb);
                }, (err) => cb(err)),
                (cb) => {
                    bootstrap(dhts);
                    waitForWellFormedTables(dhts, 7, 0, 20 * 1000, cb);
                    cb();
                }
            ], done);
        });
    });

    it("layered get", function (done) {
        this.timeout(40 * 1000);

        setupDHTs(4, (err, dhts) => {
            assert.notExists(err);

            waterfall([
                (cb) => connect(dhts[0], dhts[1], cb),
                (cb) => connect(dhts[1], dhts[2], cb),
                (cb) => connect(dhts[2], dhts[3], cb),
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
    });

    it.skip("findPeer", function (done) {
        this.timeout(40 * 1000);

        setupDHTs(4, (err, dhts, addrs, ids) => {
            assert.notExists(err);

            waterfall([
                (cb) => connect(dhts[0], dhts[1], cb),
                (cb) => connect(dhts[1], dhts[2], cb),
                (cb) => connect(dhts[2], dhts[3], cb),
                (cb) => dhts[0].findPeer(ids[3], 1000, cb),
                (res, cb) => {
                    expect(res.id.isEqual(ids[3])).to.eql(true);
                    cb();
                }
            ], done);
        });
    });

    it("connect by id to with address in the peerbook ", function (done) {
        this.timeout(20 * 1000);

        parallel([
            (cb) => setupDHT(cb),
            (cb) => setupDHT(cb)
        ], (err, dhts) => {
            assert.notExists(err);
            const dhtA = dhts[0];
            const dhtB = dhts[1];

            const peerA = dhtA.peerInfo;
            const peerB = dhtB.peerInfo;
            dhtA.peerBook.put(peerB);
            dhtB.peerBook.put(peerA);

            parallel([
                (cb) => dhtA.swarm.dial(peerB.id, cb),
                (cb) => dhtB.swarm.dial(peerA.id, cb)
            ], done);
        });
    });

    // TODO fix this
    it.skip("find peer query", function (done) {
        this.timeout(40 * 1000);

        setupDHTs(101, (err, dhts, addrs, ids) => {
            assert.notExists(err);

            const guy = dhts[0];
            const others = dhts.slice(1);
            const val = Buffer.from("foobar");

            series([
                (cb) => times(20, (i, cb) => {
                    times(16, (j, cb) => {
                        const t = 20 + random(0, 79);
                        connect(others[i], others[t], cb);
                    }, cb);
                }, cb),
                (cb) => times(20, (i, cb) => {
                    connect(guy, others[i], cb);
                }, cb),
                (cb) => {
                    const rtval = kadUtils.convertBuffer(val);
                    const rtablePeers = guy.routingTable.closestPeers(rtval, c.ALPHA);
                    expect(rtablePeers).to.have.length(3);

                    const netPeers = guy.peerBook.getAllArray().filter((p) => p.isConnected());
                    expect(netPeers).to.have.length(20);

                    const rtableSet = {};
                    rtablePeers.forEach((p) => {
                        rtableSet[p.asBase58()] = true;
                    });

                    series([
                        (cb) => guy.getClosestPeers(val, cb),
                        (cb) => kadUtils.sortClosestPeers(ids.slice(1), rtval, cb)
                    ], (err, res) => {
                        assert.notExists(err);
                        const out = res[0];
                        const actualClosest = res[1];

                        expect(out.filter((p) => !rtableSet[p.asBase58()]))
                            .to.not.be.empty();

                        expect(out).to.have.length(20);
                        const exp = actualClosest.slice(0, 20);

                        kadUtils.sortClosestPeers(out, rtval, (err, got) => {
                            assert.notExists(err);
                            expect(countDiffPeers(exp, got)).to.eql(0);

                            cb();
                        });
                    });
                }
            ], done);
        });
    });

    it("getClosestPeers", function (done) {
        this.timeout(40 * 1000);

        const nDHTs = 30;
        setupDHTs(nDHTs, (err, dhts) => {
            assert.notExists(err);

            // ring connect
            series([
                (cb) => times(dhts.length, (i, cb) => {
                    connect(dhts[i], dhts[(i + 1) % dhts.length], cb);
                }, cb),
                (cb) => dhts[1].getClosestPeers(Buffer.from("foo"), cb)
            ], (err, res) => {
                assert.notExists(err);
                expect(res[1]).to.have.length(c.K);
                done();
            });
        });
    });

    describe("getPublicKey", () => {
        it("already known", function (done) {
            this.timeout(20 * 1000);

            setupDHTs(2, (err, dhts, addrs, ids) => {
                assert.notExists(err);
                dhts[0].peerBook.put(dhts[1].peerInfo);
                dhts[0].getPublicKey(ids[1], (err, key) => {
                    assert.notExists(err);
                    expect(key).to.be.eql(dhts[1].peerInfo.id.pubKey);
                    done();
                });
            });
        });

        it("connected node", function (done) {
            this.timeout(40 * 1000);

            setupDHTs(2, (err, dhts, addrs, ids) => {
                assert.notExists(err);

                waterfall([
                    (cb) => connect(dhts[0], dhts[1], cb),
                    (cb) => {
                        // remove the pub key to be sure it is fetched
                        const p = dhts[0].peerBook.get(ids[1]);
                        p.id._pubKey = null;
                        dhts[0].peerBook.put(p, true);
                        dhts[0].getPublicKey(ids[1], cb);
                    },
                    (key, cb) => {
                        expect(key.equals(dhts[1].peerInfo.id.pubKey)).to.eql(true);
                        cb();
                    }
                ], done);
            });
        });
    });

    it("_nearestPeersToQuery", () => {
        const swarm = new Swarm(peerInfos[0], new PeerBook());
        swarm.transport.add("tcp", new TCP());
        swarm.connection.addStreamMuxer(multiplex);
        swarm.connection.reuse();
        const dht = new KadDHT(swarm);

        dht.peerBook.put(peerInfos[1]);
        dht._add(peerInfos[1]);
        const res = dht._nearestPeersToQuery({ key: "hello" });
        expect(res).to.be.eql([peerInfos[1]]);
    });

    it("_betterPeersToQuery", () => {
        const swarm = new Swarm(peerInfos[0], new PeerBook());
        swarm.transport.add("tcp", new TCP());
        swarm.connection.addStreamMuxer(multiplex);
        swarm.connection.reuse();
        const dht = new KadDHT(swarm);

        dht.peerBook.put(peerInfos[1]);
        dht.peerBook.put(peerInfos[2]);

        dht._add(peerInfos[1]);
        dht._add(peerInfos[2]);

        const res = dht._betterPeersToQuery({ key: "hello" }, peerInfos[1]);
        expect(res).to.be.eql([peerInfos[2]]);
    });

    describe("_verifyRecordLocally", () => {
        it("invalid record (missing public key)", () => {
            const swarm = new Swarm(peerInfos[0], new PeerBook());
            swarm.transport.add("tcp", new TCP());
            swarm.connection.addStreamMuxer(multiplex);
            swarm.connection.reuse();
            const dht = new KadDHT(swarm);

            // Not putting the peer info into the peerbook
            // dht.peerBook.put(peerInfos[1])

            const record = new Record(
                Buffer.from("hello"),
                Buffer.from("world"),
                peerInfos[1].id
            );

            const enc = record.serializeSigned(peerInfos[1].id.privKey);
            assert.throws(() => dht._verifyRecordLocally(Record.deserialize(enc)), /Missing public key/);
        });

        it("valid record - signed", () => {
            const swarm = new Swarm(peerInfos[0], new PeerBook());
            swarm.transport.add("tcp", new TCP());
            swarm.connection.addStreamMuxer(multiplex);
            swarm.connection.reuse();
            const dht = new KadDHT(swarm);

            dht.peerBook.put(peerInfos[1]);

            const record = new Record(
                Buffer.from("hello"),
                Buffer.from("world"),
                peerInfos[1].id
            );

            const enc = record.serializeSigned(peerInfos[1].id.privKey);
            dht._verifyRecordLocally(Record.deserialize(enc));
        });

        it("valid record - not signed", () => {
            const swarm = new Swarm(peerInfos[0], new PeerBook());
            swarm.transport.add("tcp", new TCP());
            swarm.connection.addStreamMuxer(multiplex);
            swarm.connection.reuse();
            const dht = new KadDHT(swarm);

            dht.peerBook.put(peerInfos[1]);

            const record = new Record(
                Buffer.from("hello"),
                Buffer.from("world"),
                peerInfos[1].id
            );
            dht._verifyRecordLocally(Record.deserialize(record.serialize()));
        });
    });
});
