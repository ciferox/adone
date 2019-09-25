const {
    async: { each, map },
    multiformat: { multiaddr },
    p2p: { PeerId, transport: { WSStar } },
    stream: { pull }
} = adone;

const SERVER_PORT = 15004;

describe("strict", () => {
    let id1;
    let ma1;
    let l1;
    let w1;

    let id2;
    let ma2;
    let l2;
    let w2;

    before((done) => {
        map(require("./ids.json"), PeerId.createFromJSON, (err, keys) => {
            expect(err).to.not.exist();

            id1 = keys.shift();
            id2 = keys.shift();
            ma1 = multiaddr(`/ip4/127.0.0.1/tcp/${SERVER_PORT}/ws/p2p-websocket-star/ipfs/${id1.toB58String()}`);
            ma2 = multiaddr(`/ip4/127.0.0.1/tcp/${SERVER_PORT}/ws/p2p-websocket-star/ipfs/${id2.toB58String()}`);

            done();
        });
    });

    it("listen on the server", async (done) => {
        w1 = new WSStar({ id: id1 });
        w2 = new WSStar({ id: id2 });

        l1 = w1.createListener((conn) => pull(conn, conn));
        l2 = w2.createListener((conn) => pull(conn, conn));

        each([
            [l1, ma1],
            [l2, ma2]
        ], (i, n) => i[0].listen(i[1], n), done);
    });

    it("dial peer 1 to peer 2", (done) => {
        w1.dial(ma2, (err, conn) => {
            expect(err).to.not.exist();
            const buf = Buffer.from("hello");

            pull(
                pull.values([buf]),
                conn,
                pull.collect((err, res) => {
                    expect(err).to.not.exist();
                    expect(res).to.eql([buf]);
                    done();
                })
            );
        });
    });
});
