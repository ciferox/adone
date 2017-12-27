const {
    multi,
    netron2: { transport: { WSStar } }
} = adone;

describe("filter", () => {
    it("filters non valid websocket-star multiaddrs", () => {
        const ws = new WSStar();

        const maArr = [
            multi.address.create("/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1"),
            multi.address.create("/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star"),
            multi.address.create("/dns/libp2p.io/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1"),
            multi.address.create("/dns/signal.libp2p.io/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1"),
            multi.address.create("/dns/signal.libp2p.io/wss/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1"),
            multi.address.create("/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo2"),
            multi.address.create("/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo3"),
            multi.address.create("/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4"),
            multi.address.create("/ip4/127.0.0.1/tcp/9090/ws/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4"),
            multi.address.create("/ip4/127.0.0.1/tcp/9090/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4"),
            multi.address.create("/p2p-websocket-star/ip4/127.0.0.1/tcp/9090/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4")
        ];

        const filtered = ws.filter(maArr);
        expect(filtered.length).to.not.equal(maArr.length);
        expect(filtered.length).to.equal(8);
    });

    it("filter a single addr for this transport", () => {
        const ws = new WSStar();
        const ma = multi.address.create("/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1");

        const filtered = ws.filter(ma);
        expect(filtered.length).to.equal(1);
    });
});
