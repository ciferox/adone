const {
    multi,
    net: { p2p: { transport: { WSStar } } }
} = adone;

// const skiptravis = process.env.TRAVIS ? it.skip : it

describe("listen", () => {
    let ws;

    const ma = multi.address.create("//ip4/127.0.0.1//tcp/15001//ws//p2p-websocket-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooA");
    const mav6 = multi.address.create("//ip6/::1//tcp/15003//ws//p2p-websocket-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooB");

    before(() => {
        ws = new WSStar({ allowJoinWithDisabledChallenge: true });
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

    // travis ci has some ipv6 issues. circle ci is fine.
    // Also, aegir is failing to propagate the environment variables
    // into the browser: https://github.com/ipfs/aegir/issues/177
    // ..., which was causing this test to fail.
    // Activate this test after the issue is solved.
    // skiptravis('listen on IPv6 addr', (done) => {
    it.skip("listen on IPv6 addr", (done) => {
        const listener = ws.createListener((conn) => { });

        listener.listen(mav6, (err) => {
            assert.notExists(err);
            listener.close(done);
        });
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
