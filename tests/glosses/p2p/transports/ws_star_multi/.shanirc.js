export default (ctx) => {
    const {
        async: { parallel },
        p2p: { rendezvous }
    } = adone;

    let _r = [];
    let f = true; // first run. used so metric gets only enabled once otherwise it crashes

    ctx.before((done) => {
        parallel([["r1", { port: 15001, metrics: f }], ["r2", { port: 15002 }], ["r3", { port: 15003, host: "::" }]].map((v) => (cb) => {
            rendezvous.start(v.pop(), (err, r) => {
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
