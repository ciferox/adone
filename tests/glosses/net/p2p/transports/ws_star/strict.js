const each = require("async/each");

const {
    crypto: { Identity },
    multi,
    net: { p2p: { transport: { WSStar } } },
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

    before(() => {
        const jsons = require("./ids.json");
        const ids = [];
        for (const json of jsons) {
            ids.push(Identity.createFromJSON(json));
        }
        id1 = ids.shift();
        id2 = ids.shift();
        ma1 = multi.address.create(`//ip4/127.0.0.1//tcp/${SERVER_PORT}//ws//p2p-websocket-star//p2p/${id1.asBase58()}`);
        ma2 = multi.address.create(`//ip4/127.0.0.1//tcp/${SERVER_PORT}//ws//p2p-websocket-star//p2p/${id2.asBase58()}`);
    });

    it("listen on the server", (done) => {
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
            assert.notExists(err);
            const buf = Buffer.from("hello");

            pull(
                pull.values([buf]),
                conn,
                pull.collect((err, res) => {
                    assert.notExists(err);
                    expect(res).to.eql([buf]);
                    done();
                })
            );
        });
    });
});
