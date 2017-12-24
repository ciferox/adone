const multiaddr = require("multiaddr");

module.exports = (create) => {
    describe("listen", () => {
        let ws;

        const ma = multiaddr("/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooA");

        before(() => {
            ws = create();
        });

        it("listen, check for callback", (done) => {
            const listener = ws.createListener((conn) => { });

            listener.listen(ma, (err) => {
                assert.notExists(err);
                listener.close(done);
            });
        });

        it("listen, check for listening event", (done) => {
            const listener = ws.createListener((conn) => { });

            listener.once("listening", () => listener.close(done));
            listener.listen(ma);
        });

        it("listen, check for the close event", (done) => {
            const listener = ws.createListener((conn) => { });
            listener.listen(ma, (err) => {
                assert.notExists(err);
                listener.once("close", done);
                listener.close();
            });
        });

        it.skip("close listener with connections, through timeout", (done) => {
            // TODO ? Should this apply ?
        });

        it.skip("listen on IPv6 addr", (done) => {
            // TODO IPv6 not supported yet
        });

        it("getAddrs", (done) => {
            const listener = ws.createListener((conn) => { });
            listener.listen(ma, (err) => {
                assert.notExists(err);
                listener.getAddrs((err, addrs) => {
                    assert.notExists(err);
                    expect(addrs[0]).to.deep.equal(ma);
                    listener.close(done);
                });
            });
        });
    });
};
