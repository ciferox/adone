const multiaddr = require("multiaddr");
const series = require("async/series");

const {
    netron2: { transport: { WSStar } },
    stream: { pull }
} = adone;

describe("valid Connection", () => {
    let ws1;
    const ma1 = multiaddr("/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo5a");

    let ws2;
    const ma2 = multiaddr("/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo5b");

    let conn;

    before((done) => {
        const first = function (next) {
            ws1 = new WSStar({ allowJoinWithDisabledChallenge: true });

            const listener = ws1.createListener((conn) => pull(conn, conn));
            listener.listen(ma1, next);
        };

        const second = function (next) {
            ws2 = new WSStar({ allowJoinWithDisabledChallenge: true });

            const listener = ws2.createListener((conn) => pull(conn, conn));
            listener.listen(ma2, next);
        };

        const dial = function () {
            conn = ws1.dial(ma2, done);
        };

        series([first, second], dial);
    });

    it("get observed addrs", (done) => {
        conn.getObservedAddrs((err, addrs) => {
            assert.notExists(err);
            expect(addrs[0].toString()).to.equal(ma2.toString());
            done();
        });
    });

    it("get Peer Info", (done) => {
        conn.getPeerInfo((err, peerInfo) => {
            assert.exists(err);
            done();
        });
    });

    it("set Peer Info", (done) => {
        conn.setPeerInfo("info");
        conn.getPeerInfo((err, peerInfo) => {
            assert.notExists(err);
            expect(peerInfo).to.equal("info");
            done();
        });
    });
});
