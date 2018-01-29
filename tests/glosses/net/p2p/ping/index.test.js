const {
    net: { p2p: { swarm: { Swarm }, transport: { TCP }, PeerInfo, PeerBook, Ping } }
} = adone;

describe("ping", function () {
    let swarmA;
    let swarmB;
    let peerA;
    let peerB;

    this.timeout(25000);

    before(async function () {
        this.timeout(25000);
        peerA = PeerInfo.create();
        peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
        peerB = PeerInfo.create();
        peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
        swarmA = new Swarm(peerA, new PeerBook());
        swarmB = new Swarm(peerB, new PeerBook());
        swarmA.tm.add("tcp", new TCP());
        swarmB.tm.add("tcp", new TCP());

        await swarmA.listen();
        await swarmB.listen();
        Ping.mount(swarmA);
        Ping.mount(swarmB);
    });

    after(async () => {
        await Promise.all([
            swarmA.close(),
            swarmB.close()
        ]);
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
