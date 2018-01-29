const parallel = require("run-parallel");
const series = require("run-series");
const util = require("./util");

const {
    net: { p2p: { multistream } },
    stream: { pull }
} = adone;

const createPair = util.createPair;

describe("custom matching function", () => {
    let conns;

    beforeEach((done) => {
        const gotConns = function (err, _conns) {
            assert.notExists(err);
            conns = _conns;
            done();
        };
        createPair(false, gotConns);
    });

    it("match-true always", (done) => {
        let msl;
        let msd;
        series([
            (next) => {
                parallel([
                    (cb) => {
                        msl = new multistream.Listener();
                        assert.exists(msl);
                        msl.handle(conns[0], cb);
                    },
                    (cb) => {
                        msd = new multistream.Dialer();
                        assert.exists(msd);
                        msd.handle(conns[1], cb);
                    }
                ], next);
            },
            (next) => {
                msl.addHandler("/does-not-matter/1.0.0", (p, conn) => {
                    pull(conn, conn);
                }, (myProtocol, requestedProtocol, callback) => {
                    callback(null, true);
                });
                next();
            },
            (next) => {
                msd.select("/it-is-gonna-match-anyway/1.0.0", (err, conn) => {
                    assert.notExists(err);

                    pull(
                        pull.values([Buffer.from("banana")]),
                        conn,
                        pull.collect((err, data) => {
                            assert.notExists(err);
                            expect(data).to.be.eql([Buffer.from("banana")]);
                            next();
                        })
                    );
                });
            }
        ], done);
    });
});
