const series = require("async/series");
const pull = require("pull-stream");

const {
    multi,
    net: { p2p: { transport: { WSStar } } }
} = adone;

describe("disconnect", () => {
    let ws1;
    const ma1 = multi.address.create("/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo5a");

    let ws2;
    const ma2 = multi.address.create("/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo5b");

    let conn;
    let otherConn;

    before((done) => {
        const first = function (next) {
            ws1 = new WSStar({ allowJoinWithDisabledChallenge: true });

            const listener = ws1.createListener((conn) => pull(conn, conn));
            listener.listen(ma1, next);
        };

        const second = function (next) {
            ws2 = new WSStar({ allowJoinWithDisabledChallenge: true });

            const listener = ws2.createListener((conn) => (otherConn = conn));
            listener.listen(ma2, next);
        };

        const dial = function () {
            conn = ws1.dial(ma2, done);
        };

        series([first, second], dial);
    });

    it("all conns die when one peer quits", (done) => {
        pull(
            conn,
            pull.collect((err) => {
                if (err) {
                    return done(err);
                }
                pull(
                    otherConn,
                    pull.collect((err) => {
                        if (err) {
                            return done(err);
                        }
                        done();
                    })
                );
            })
        );
        const url = Object.keys(ws2.listeners_list).shift();
        ws2.listeners_list[url]._down();
    });
});
