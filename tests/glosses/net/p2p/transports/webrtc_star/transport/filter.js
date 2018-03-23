const {
    multi
} = adone;

module.exports = (create) => {
    describe("filter", () => {
        it("filters non valid webrtc-star multiaddrs", () => {
            const ws = create();

            const maArr = [
                multi.address.create("//ip4/127.0.0.1//tcp/9090//ws//p2p-webrtc-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1"),
                multi.address.create("//ip4/127.0.0.1//tcp/9090//ws//p2p-webrtc-star"),
                multi.address.create("//dns/libp2p.io//ws//p2p-webrtc-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1"),
                multi.address.create("//dns/signal.libp2p.io//ws//p2p-webrtc-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1"),
                multi.address.create("//dns/signal.libp2p.io/wss//p2p-webrtc-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1"),
                multi.address.create("//ip4/127.0.0.1//tcp/9090//ws//p2p-webrtc-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo2"),
                multi.address.create("//ip4/127.0.0.1//tcp/9090//ws//p2p-webrtc-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo3"),
                multi.address.create("ip4/127.0.0.1//tcp/9090//ws//p2p-webrtc-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4"),
                multi.address.create("//ip4/127.0.0.1//tcp/9090//ws//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4"),
                multi.address.create("//ip4/127.0.0.1//tcp/9090//p2p-webrtc-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4"),
                multi.address.create("//ip4/127.0.0.1//tcp/9090//p2p-webrtc-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4" +
                    "/p2p-circuit//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1")
            ];

            const filtered = ws.filter(maArr);
            expect(filtered.length).to.equal(7);
        });

        it("filter a single addr for this transport", () => {
            const ws = create();
            const ma = multi.address.create("//ip4/127.0.0.1//tcp/9090//ws//p2p-webrtc-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1");

            const filtered = ws.filter(ma);
            expect(filtered.length).to.equal(1);
        });
    });
};
