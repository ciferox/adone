const {
    multi,
    net: { p2p: { rendezvous, transport: { WSStar } } }
} = adone;

const SERVER_PORT = 13580;

describe.todo("reconnect to signaling server", function () {
    this.timeout(30000);

    let r;
    let ws1;
    const ma1 = multi.address.create("//ip4/127.0.0.1//tcp/13580//ws//p2p-websocket-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo6A");

    let ws2;
    const ma2 = multi.address.create("//ip4/127.0.0.1//tcp/13580//ws//p2p-websocket-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo6B");

    let ws3;
    const ma3 = multi.address.create("//ip4/127.0.0.1//tcp/13580//ws//p2p-websocket-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo6C");

    before((done) => {
        r = rendezvous.start({
            port: SERVER_PORT,
            cryptoChallenge: false
        }, done);
    });

    after((done) => r.stop(done));

    it("listen on the first", (done) => {
        ws1 = new WSStar({ allowJoinWithDisabledChallenge: true });

        const listener = ws1.createListener((conn) => { });
        listener.listen(ma1, (err) => {
            assert.notExists(err);
            done();
        });
    });

    it("listen on the second, discover the first", (done) => {
        ws2 = new WSStar({ allowJoinWithDisabledChallenge: true });

        ws1.discovery.once("peer", (peerInfo) => {
            expect(peerInfo.multiaddrs.has(ma2)).to.equal(true);
            done();
        });

        const listener = ws2.createListener((conn) => { });
        listener.listen(ma2, (err) => {
            assert.notExists(err);
        });
    });

    it("stops the server", (done) => {
        r.stop(done);
    });

    it("starts the server again", (done) => {
        r = rendezvous.start({ port: SERVER_PORT, cryptoChallenge: false }, done);
    });

    it("wait a bit for clients to reconnect", (done) => {
        setTimeout(done, 1990);
    });

    it("listen on the third, first discovers it", (done) => {
        ws3 = new WSStar({ allowJoinWithDisabledChallenge: true });

        const listener = ws3.createListener((conn) => { });
        listener.listen(ma3, (err) => assert.notExists(err));

        ws1.discovery.once("peer", (peerInfo) => {
            expect(peerInfo.multiaddrs.has(ma3)).to.equal(true);
            done();
        });
    });
});
