const {
    multi,
    net: { p2p: { transport: { WebRTCStar: { sigServer } } } }
} = adone;

const SERVER_PORT = 13580;

module.exports = (create) => {
    describe("reconnect to signaling server", function () {
        this.timeout(30000);

        let sigS;

        const base = (id) => {
            return `/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/${id}`;
        };

        let ws1;
        let ws2;
        let ws3;

        const ma1 = multi.address.create(base("QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo3A"));
        const ma2 = multi.address.create(base("QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo3B"));
        const ma3 = multi.address.create(base("QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo3C"));

        before((done) => {
            sigS = sigServer.start({ port: SERVER_PORT }, done);
        });

        after((done) => sigS.stop(done));

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

        it("stops the server", (done) => {
            sigS.stop(done);
        });

        it("starts the server again", (done) => {
            sigS = sigServer.start({ port: SERVER_PORT }, done);
        });

        it("wait a bit for clients to reconnect", (done) => {
            setTimeout(done, 2000);
        });

        it("listen on the third, first discovers it", (done) => {
            ws3 = create();

            const listener = ws3.createListener((conn) => { });
            listener.listen(ma3, (err) => assert.notExists(err));

            ws1.discovery.once("peer", (peerInfo) => {
                expect(peerInfo.multiaddrs.has(ma3)).to.equal(true);
                done();
            });
        });
    });
};