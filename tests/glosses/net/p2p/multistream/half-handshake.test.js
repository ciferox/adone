const util = require("./util");

const {
    net: { p2p: { multistream } },
    stream: { pull }
} = adone;

const createPair = util.createPair;

describe("half-handshake", () => {
    let conns;

    beforeEach((done) => {
        const gotConns = function (err, _conns) {
            assert.notExists(err);
            conns = _conns;
            done();
        };

        createPair(false, gotConns);
    });

    it("dialer - sends the mss multicodec", (done) => {
        const dialerConn = conns[0];
        const listenerConn = conns[1];

        pull(
            listenerConn,
            pull.lengthPrefixed.decode(),
            pull.drain((data) => {
                expect(data.toString()).to.equal("/multistream/1.0.0\n");
                done();
            })
        );

        const msd = new multistream.Dialer();
        assert.exists(msd);
        msd.handle(dialerConn, () => { });
    });

    it("listener sends the mss multicodec", (done) => {
        const dialerConn = conns[0];
        const listenerConn = conns[1];

        pull(
            dialerConn,
            pull.lengthPrefixed.decode(),
            pull.drain((data) => {
                expect(data.toString()).to.equal("/multistream/1.0.0\n");
                done();
            })
        );

        const msl = new multistream.Listener();
        assert.exists(msl);
        msl.handle(listenerConn, () => { });
    });
});
