const parallel = require("async/parallel");
const waterfall = require("async/waterfall");
const map = require("async/map");
const timesSeries = require("async/timesSeries");
const each = require("async/each");
const eachSeries = require("async/eachSeries");
const util = require("./utils");

const {
    datastore: { backend: { Memory: MemoryStore, Level: LevelStore } },
    multi,
    net: { p2p: { dht, CID } },
    vendor: { lodash: { range } },
    std: { os, path }
} = adone;
const { Providers } = adone.private(dht);


describe("dht", "KadDHT", "Providers", function () {
    this.timeout(300 * 1000);

    let infos;

    before(() => {

        infos = util.makePeers(3);
    });

    it("simple add and get of providers", (done) => {
        const providers = new Providers(new MemoryStore(), infos[2].id);

        const cid = new CID("QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n");

        parallel([
            (cb) => providers.addProvider(cid, infos[0].id, cb),
            (cb) => providers.addProvider(cid, infos[1].id, cb)
        ], (err) => {
            providers.getProviders(cid, (err, provs) => {
                assert.notExists(err);
                expect(provs).to.be.eql([infos[0].id, infos[1].id]);

                done();
            });
        });
    });

    it("more providers than space in the lru cache", (done) => {
        const providers = new Providers(new MemoryStore(), infos[2].id, 10);

        waterfall([
            (cb) => map(
                range(100),
                (i, cb) => {
                    cb(null, multi.hash.create(Buffer.from(`hello ${i}`), "sha2-256"));
                },
                cb
            ),
            (hashes, cb) => {
                const cids = hashes.map((h) => new CID(h));

                map(cids, (cid, cb) => {
                    providers.addProvider(cid, infos[0].id, cb);
                }, (err) => cb(err, cids));
            },
            (cids, cb) => {
                map(cids, (cid, cb) => {
                    providers.getProviders(cid, cb);
                }, (err, provs) => {
                    assert.notExists(err);
                    expect(provs).to.have.length(100);
                    provs.forEach((p) => {
                        expect(p[0].id).to.be.eql(infos[0].id.id);
                    });
                    cb();
                });
            }
        ], done);
    });

    it("expires", (done) => {
        const providers = new Providers(new MemoryStore(), infos[2].id);
        providers.cleanupInterval = 100;
        providers.provideValidity = 200;

        const cid = new CID("QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n");
        parallel([
            (cb) => providers.addProvider(cid, infos[0].id, cb),
            (cb) => providers.addProvider(cid, infos[1].id, cb)
        ], (err) => {
            assert.notExists(err);

            providers.getProviders(cid, (err, provs) => {
                assert.notExists(err);
                expect(provs).to.have.length(2);
                expect(provs[0].id).to.be.eql(infos[0].id.id);
                expect(provs[1].id).to.be.eql(infos[1].id.id);
            });

            setTimeout(() => {
                providers.getProviders(cid, (err, provs) => {
                    assert.notExists(err);
                    expect(provs).to.have.length(0);
                    done();
                });
            }, 300);
        });
    });

    // slooow so only run when you need to
    it("many", (done) => {
        const p = path.join(
            os.tmpdir(), (Math.random() * 100).toString()
        );
        const store = new LevelStore(p);
        const providers = new Providers(store, infos[2].id, 10);

        const peers = util.makePeers(600);
        const values = util.makeValues(100);
        eachSeries(values, (v, cb) => {
            eachSeries(peers, (p, cb) => {
                providers.addProvider(v.cid, p.id, cb);
            }, cb);
        }, (err) => {
            assert.notExists(err);
            timesSeries(3, (i, cb) => {
                each(values, (v, cb) => {
                    providers.getProviders(v.cid, cb);
                }, (err) => {
                    assert.notExists(err);
                    cb();
                });
            }, () => {
                store.close(done);
            });
        });

    });
});
