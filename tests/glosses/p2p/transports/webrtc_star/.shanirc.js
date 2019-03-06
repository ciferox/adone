export default (ctx) => {
    const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "transports", "webrtc_star", ...args);
    const sigServer = require(srcPath("sig-server"));
    let firstRun = true;
    let sigS;

    ctx.before((done) => {
        const options = {
            port: 15555,
            host: "127.0.0.1",
            metrics: firstRun
        };

        if (firstRun) {
            firstRun = false;
        }

        sigServer.start(options, (err, server) => {
            if (err) {
                throw err;
            }

            sigS = server;
            console.log("signalling on:", server.info.uri);
            done();
        });
    });

    ctx.after((done) => {
        sigS.stop().then(done);
    });
};
