const series = require("async/series");
const parallel = require("async/parallel");

const {
    netron2: { swarm: { Swarm }, transport: { TCP }, PeerInfo, PeerBook, Ping }
} = adone;

describe("netron2", "ping", () => {
    let swarmA;
    let swarmB;
    let peerA;
    let peerB;

    before((done) => {
        series([
            (cb) => PeerInfo.create((err, peerInfo) => {
                assert.notExists(err);
                peerA = peerInfo;
                peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
                cb();
            }),
            (cb) => PeerInfo.create((err, peerInfo) => {
                assert.notExists(err);
                peerB = peerInfo;
                peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
                cb();
            }),
            (cb) => {
                swarmA = new Swarm(peerA, new PeerBook());
                swarmB = new Swarm(peerB, new PeerBook());
                swarmA.transport.add("tcp", new TCP());
                swarmB.transport.add("tcp", new TCP());
                cb();
            },
            (cb) => swarmA.listen(cb),
            (cb) => swarmB.listen(cb),
            (cb) => {
                Ping.mount(swarmA);
                Ping.mount(swarmB);
                cb();
            }
        ], done);
    });

    after((done) => {
        parallel([
            (cb) => swarmA.close(cb),
            (cb) => swarmB.close(cb)
        ], done);
    });

    it("ping once from peerA to peerB", (done) => {
        const p = new Ping(swarmA, peerB);

        p.on("error", (err) => {
            assert.notExists(err);
        });

        p.on("ping", (time) => {
            expect(time).to.be.a("Number");
            p.stop();
            done();
        });
    });

    it("ping 5 times from peerB to peerA", (done) => {
        const p = new Ping(swarmB, peerA);

        p.on("error", (err) => {
            assert.notExists(err);
        });

        let counter = 0;

        p.on("ping", (time) => {
            expect(time).to.be.a("Number");
            if (++counter === 5) {
                p.stop();
                done();
            }
        });
    });

    it("ping itself", (done) => {
        const p = new Ping(swarmA, peerA);

        p.on("error", (err) => {
            assert.notExists(err);
        });

        p.on("ping", (time) => {
            expect(time).to.be.a("Number");
            p.stop();
            done();
        });
    });

    it("unmount PING protocol", () => {
        Ping.unmount(swarmA);
        Ping.unmount(swarmB);
    });
});
