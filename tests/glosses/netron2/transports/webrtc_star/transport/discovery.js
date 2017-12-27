const {
    multi
} = adone;

module.exports = (create) => {
    describe("peer discovery", () => {
        let ws1;
        const base = (id) => {
            return `/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/${id}`;
        };
        const ma1 = multi.address.create(base("QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo3A"));

        let ws2;
        const ma2 = multi.address.create(base("QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo3B"));

        it("listen on the first", (done) => {
            ws1 = create();

            const listener = ws1.createListener((conn) => { });
            listener.listen(ma1, (err) => {
                assert.notExists(err);
                done();
            });
        });

        it("listen on the second, discover the first", (done) => {
            ws2 = create();

            ws1.discovery.once("peer", (peerInfo) => {
                expect(peerInfo.multiaddrs.has(ma2)).to.equal(true);
                done();
            });

            const listener = ws2.createListener((conn) => { });
            listener.listen(ma2, (err) => {
                assert.notExists(err);
            });
        });
    });
};
