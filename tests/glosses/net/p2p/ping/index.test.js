const {
    net: { p2p: { switch: { Switch }, transport: { TCP }, PeerInfo, PeerBook, Ping } }
} = adone;

describe("ping", function () {
    let switchA;
    let switchB;
    let peerA;
    let peerB;

    this.timeout(25000);

    before(async function () {
        this.timeout(25000);
        peerA = PeerInfo.create();
        peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
        peerB = PeerInfo.create();
        peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
        switchA = new Switch(peerA, new PeerBook());
        switchB = new Switch(peerB, new PeerBook());
        switchA.tm.add("tcp", new TCP());
        switchB.tm.add("tcp", new TCP());

        await switchA.start();
        await switchB.start();
        Ping.mount(switchA);
        Ping.mount(switchB);
    });

    after(async () => {
        await Promise.all([
            switchA.stop(),
            switchB.stop()
        ]);
    });

    it("ping once from peerA to peerB", (done) => {
        const p = new Ping(switchA, peerB);

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
        const p = new Ping(switchB, peerA);

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
        const p = new Ping(switchA, peerA);

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
        Ping.unmount(switchA);
        Ping.unmount(switchB);
    });
});
