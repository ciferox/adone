const {
    async: { each },
    multi,
    net: { p2p: { transport: { WSStar } } }
} = adone;

describe("peer discovery", () => {
    const listeners = [];
    let ws1;
    const ma1 = multi.address.create("//ip4/127.0.0.1//tcp/15001//ws//p2p-websocket-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo3A");

    let ws2;
    const ma2 = multi.address.create("//ip4/127.0.0.1//tcp/15003//ws//p2p-websocket-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo3B");

    it("listen on the first", (done) => {
        ws1 = new WSStar({ allowJoinWithDisabledChallenge: true });

        const listener = ws1.createListener((/* conn */) => { });

        listeners.push(listener);
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

        const listener = ws2.createListener((/* conn */) => { });

        listeners.push(listener);
        listener.listen(ma2, (err) => {
            assert.notExists(err);
        });
    }).timeout(5000);

    after((done) => each(listeners, (l, next) => l.close(next), done));
});
