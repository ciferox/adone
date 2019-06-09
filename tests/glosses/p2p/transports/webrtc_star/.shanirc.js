export default (ctx) => {
    const srcPath = (...args) => adone.getPath("lib", "glosses", "p2p", "transports", "webrtc_star", ...args);
    const sigServer = require(srcPath("sig-server"));
    let firstRun = true;
    let sigS;

    ctx.before(async () => {
        const options = {
            port: 15555,
            host: "127.0.0.1",
            metrics: firstRun
        };

        if (firstRun) {
            firstRun = false;
        }

        sigS = await sigServer.start(options);
        console.log("signalling on:", sigS.info.uri);
    });

    ctx.after(async () => {
        await sigS.stop();
    });
};
