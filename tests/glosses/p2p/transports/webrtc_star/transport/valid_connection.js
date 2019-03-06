const multiaddr = require("multiaddr");
const series = require("async/series");

const {
    stream: { pull2: pull }
} = adone;

module.exports = (create) => {
    describe("valid Connection", () => {
        let ws1;

        const base = (id) => {
            return `/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/ipfs/${id}`;
        };
        const ma1 = multiaddr(base("QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo3A"));

        let ws2;
        const ma2 = multiaddr(base("QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo3B"));

        let conn;

        before(function (done) {
            this.timeout(40 * 1000);

            const first = function (next) {
                ws1 = create();

                const listener = ws1.createListener((conn) => pull(conn, conn));
                listener.listen(ma1, next);
            };

            const second = function (next) {
                ws2 = create();

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
                expect(err).to.not.exist();
                expect(addrs[0].toString()).to.equal(ma2.toString());
                done();
            });
        });

        it("get Peer Info", (done) => {
            conn.getPeerInfo((err, peerInfo) => {
                expect(err).to.exist();
                done();
            });
        });

        it("set Peer Info", (done) => {
            conn.setPeerInfo("info");
            conn.getPeerInfo((err, peerInfo) => {
                expect(err).to.not.exist();
                expect(peerInfo).to.equal("info");
                done();
            });
        });
    });
};
