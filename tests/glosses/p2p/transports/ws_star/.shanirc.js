export default (ctx) => {
    const parallel = require("async/parallel");

    const {
        p2p: { rendezvous }
    } = adone;

    let _r = [];
    let f = true; // first run. used so metric gets only enabled once otherwise it crashes

    ctx.before((done) => {
        const base = (v) => Object.assign({
            host: "0.0.0.0",
            cryptoChallenge: false,
            strictMultiaddr: false,
            refreshPeerListIntervalMS: 1000
        }, v);

        parallel([["r1", { port: 15001, metrics: f }], ["r2", { port: 15002 }], ["r3", { port: 15003, host: "::" }], ["r4", { port: 15004, cryptoChallenge: true }]].map((v) => (cb) => {
            rendezvous.start(base(v.pop()), (err, r) => {
                if (err) {
                    return cb(err);
                }
                _r.push(r);
                console.log("%s: %s", v.pop(), r.info.uri);
                cb();
            });
        }), done);
        if (f) {
            f = false;
        }
    });

    ctx.after((done) => {
        parallel(_r.map((r) => (cb) => r.stop().then(cb)), done);
        _r = [];
    });
};