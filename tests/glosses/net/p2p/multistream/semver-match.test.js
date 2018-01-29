const parallel = require("run-parallel");
const series = require("run-series");
const util = require("./util");

const {
    net: { p2p: { multistream } },
    stream: { pull }
} = adone;


const createPair = util.createPair;

describe("semver-match", () => {
    let conns;

    beforeEach((done) => {
        const gotConns = function (err, _conns) {
            assert.notExists(err);
            conns = _conns;
            done();
        };
        createPair(false, gotConns);
    });

    it("should match", (done) => {
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
                msl.addHandler("/monster/1.0.0", (p, conn) => {
                    pull(conn, conn);
                }, multistream.matchSemver);
                next();
            },
            (next) => {
                msd.select("/monster/1.0.0", (err, conn) => {
                    assert.notExists(err);

                    pull(
                        pull.values(["cookie"]),
                        conn,
                        pull.collect((err, data) => {
                            assert.notExists(err);
                            expect(data[0].toString()).to.be.eql("cookie");
                            next();
                        })
                    );
                });
            }
        ], done);
    });

    it("should not match", (done) => {
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
                msl.addHandler("/monster/1.1.0", (p, conn) => {
                    pull(conn, conn);
                }, multistream.matchSemver);
                next();
            },
            (next) => {
                msd.select("/monster/2.0.0", (err, conn) => {
                    assert.exists(err);
                    next();
                });
            }
        ], done);
    });
});
